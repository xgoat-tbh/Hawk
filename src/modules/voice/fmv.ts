import { PermissionsBitField } from 'discord.js';
import type { GuildMember, GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';
import { createFmvRequest, cancelFmvRequest } from './FmvManager.js';
import { ui } from '../../core/ui/index.js';
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';

export default defineCommand({
  name: 'fmv',
  module: 'voice',
  description: 'Force Move a target user to your voice channel when they are in or join voice.',
  usage: 'fmv <@user> | fmv cancel [@user]',
  examples: ['fmv @User', 'fmv cancel @User', 'fmv cancel'],
  permissions: [PermissionsBitField.Flags.Administrator],
  botPermissions: [PermissionsBitField.Flags.MoveMembers],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, channel, message } = ctx;

    respond.enableAutoClean(5000);

    if (parsed.args.length === 0) {
      await respond.error('Usage: `fmv <@user>` or `fmv cancel [@user]`');
      return;
    }

    const firstArg = parsed.args[0].toLowerCase();

    // ── Subcommand: cancel ────────────────────────────────────
    if (firstArg === 'cancel') {
      const authority = getAuthorityLevel(member.id, guild.ownerId);
      const isElevated = authority >= AuthorityLevel.ServerAdmin;

      let targetId: string | undefined;

      if (parsed.args.length > 1) {
        const targetResult = await resolveUser(parsed.args.slice(1).join(' '), guild);
        if (!targetResult.success) {
          await respond.error(`Target: ${targetResult.error}`);
          return;
        }
        targetId = targetResult.value.id;
      }

      const cancelledCount = await cancelFmvRequest({
        guildId: guild.id,
        authorId: member.id,
        targetId,
        isElevated,
      });

      if (cancelledCount > 0) {
        await respond.success(
          targetId
            ? `Cancelled active FMV request for ${mentionUser(targetId)}.`
            : `Cancelled **${cancelledCount}** active FMV request(s).`,
        );
      } else {
        await respond.info(
          targetId
            ? `No active FMV request found for ${mentionUser(targetId)}.`
            : 'No active FMV requests found for you in this server.',
        );
      }
      return;
    }

    // ── Main Command: fmv <@user> ─────────────────────────────
    if (!member.voice.channel) {
      await respond.error('You must be in a voice channel to use `fmv`.');
      return;
    }

    const destVc = member.voice.channel;

    const targetResult = await resolveUser(parsed.args.join(' '), guild);
    if (!targetResult.success) {
      await respond.error(`Target: ${targetResult.error}`);
      return;
    }

    if (!targetResult.value.member) {
      await respond.error('Target user is not a member of this server.');
      return;
    }

    const targetMember: GuildMember = targetResult.value.member;

    if (targetMember.user.bot) {
      await respond.error('You cannot use `fmv` on a bot.');
      return;
    }

    if (targetMember.id === member.id) {
      await respond.error('You cannot use `fmv` on yourself.');
      return;
    }

    // Voice Access Restrictions Check against author's destination VC
    const access = await checkVoiceAccess(guild.id, member, 'fmv', destVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    // Send initial FMV Notice Payload with explicit user ping
    const initialPayload = ui.standard({
      title: 'Force Move',
      text: `<@${targetMember.id}>\nCreating force-move request to <#${destVc.id}>...`,
    });

    const noticeMessage = await (channel as GuildTextBasedChannel).send({
      content: `<@${targetMember.id}>`,
      components: initialPayload.components,
      flags: initialPayload.flags as any,
      allowedMentions: { users: [targetMember.id] },
    });
    message.delete().catch(() => {});

    try {
      await createFmvRequest({
        guildId: guild.id,
        authorId: member.id,
        targetMember,
        destinationChannelId: destVc.id,
        requestMessage: noticeMessage,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await noticeMessage.delete().catch(() => {});
      await respond.error(msg);
    }
  },
});

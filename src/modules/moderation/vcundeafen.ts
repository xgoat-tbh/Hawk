import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { isMemberManageable } from './roleHelpers.js';
import { mentionChannel } from '../../core/utils/formatters.js';

export default defineCommand({
  name: 'vcundeafen',
  aliases: ['vud', 'voiceundeafen', 'vundeaf'],
  module: 'moderation',
  description: 'Server undeafen one or multiple members in voice, or all members in a voice channel.',
  usage: 'vcundeafen <targets...> | vcundeafen all [channel]',
  examples: ['vcundeafen @User', 'vcundeafen @User1 @User2', 'vcundeafen all', 'vcundeafen all #General'],
  permissions: [PermissionsBitField.Flags.DeafenMembers],
  botPermissions: [PermissionsBitField.Flags.DeafenMembers],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}vcundeafen <targets...> | ${parsed.prefix}vcundeafen all [channel]\``);
      return;
    }

    const isAll = parsed.args.some((a) => ['all', '?all', '*'].includes(a.toLowerCase()));

    if (isAll) {
      const nonAllArgs = parsed.args.filter((a) => !['all', '?all', '*'].includes(a.toLowerCase()));
      let targetVc: VoiceBasedChannel | null = null;

      if (nonAllArgs.length > 0) {
        const vcQuery = nonAllArgs.join(' ');
        const vcRes = resolveVoiceChannel(vcQuery, guild);
        if (!vcRes.success) {
          await respond.error(vcRes.error);
          return;
        }
        targetVc = vcRes.value.channel;
      } else {
        targetVc = member.voice.channel;
      }

      if (!targetVc) {
        await respond.error('You must be connected to a voice channel or specify a voice channel to undeafen all.');
        return;
      }

      const connectedMembers = Array.from(targetVc.members.values());
      const eligibleMembers = connectedMembers.filter((m) => {
        if (!isMemberManageable(guild, m, member)) return false;
        if (!m.voice.serverDeaf) return false; // already undeafened
        return true;
      });

      if (eligibleMembers.length === 0) {
        await respond.info(`No deafened manageable members found in ${mentionChannel(targetVc.id)}.`);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      const results = await Promise.allSettled(
        eligibleMembers.map((m) => m.voice.setDeaf(false, `VCUndeafen All by ${member.user.tag}`)),
      );

      for (const res of results) {
        if (res.status === 'fulfilled') successCount++;
        else failCount++;
      }

      await respond.success(
        `Undeafened **${successCount}** user(s) in ${mentionChannel(targetVc.id)}.${failCount > 0 ? ` (Failed: ${failCount})` : ''}`,
      );

      logEvent('info', 'command_execution', `VCUndeafen All by ${member.user.tag}`, {
        executor: member.user.tag,
        executorId: member.id,
        guild: guild.name,
        guildId: guild.id,
        channel: targetVc.name,
        successCount,
        failCount,
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const arg of parsed.args) {
      const res = await resolveUser(arg, guild);
      if (res.success && res.value.member) {
        const targetMember = res.value.member;
        if (!isMemberManageable(guild, targetMember, member)) {
          failCount++;
          continue;
        }
        if (targetMember.voice.channel) {
          try {
            await targetMember.voice.setDeaf(false);
            successCount++;
          } catch {
            failCount++;
          }
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    }

    await respond.success(`Undeafened **${successCount}** user(s) in voice.${failCount > 0 ? ` Failed/Not in VC: ${failCount}` : ''}`);

    logEvent('info', 'command_execution', `VCUndeafen by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      successCount,
      failCount,
    });
  },
});

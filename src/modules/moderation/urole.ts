import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { toggleRoleForMember, extractForceMoveOption, executeForceMove } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import { LiveProgressTracker, renderProgressBar } from '../../core/utils/ProgressBar.js';

export default defineCommand({
  name: 'urole',
  aliases: ['ur', 'removerole', 'unrole', 'takerole'],
  module: 'moderation',
  description: 'Toggle ONE role across MULTIPLE users, with optional force-move to a voice channel.',
  usage: 'urole <role> <users...> [fmv <#vc>]',
  examples: ['urole @Role @User1 @User2 @User3', 'urole @Role @User1 @User2 fmv #General'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    const fmvResult = extractForceMoveOption(parsed.args, guild, member);
    if (fmvResult.error) {
      await respond.error(fmvResult.error);
      return;
    }

    const cleanArgs = fmvResult.cleanArgs;
    if (cleanArgs.length < 2) {
      await respond.error(`Usage: \`${parsed.prefix}urole <role> <users...> [fmv <#vc>]\``);
      return;
    }

    const roleRes = resolveRole(cleanArgs[0], guild);
    if (!roleRes.success) {
      await respond.error(`Role: ${roleRes.error}`);
      return;
    }

    const targetRole = roleRes.value.role;
    const userArgs = cleanArgs.slice(1);
    const totalUsers = userArgs.length;

    let statusMsg = null;
    let tracker: LiveProgressTracker | null = null;
    if (totalUsers > 3) {
      const initialPayload = buildV2Container({
        text: `⏳ **Processing URole** (${mentionRole(targetRole.id)})`,
        sections: [`**Progress:** ${renderProgressBar(0, totalUsers)} (0/${totalUsers})\nAdded: **0** | Removed: **0** | Skipped: **0**`],
      });
      statusMsg = await (ctx.channel as GuildTextBasedChannel).send(initialPayload).catch(() => null);
      if (statusMsg) {
        tracker = new LiveProgressTracker(statusMsg, `URole (${targetRole.name})`, totalUsers);
      }
    }

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;
    const affectedMembersList: import('discord.js').GuildMember[] = [];

    let processed = 0;
    for (const userArg of userArgs) {
      const userRes = await resolveUser(userArg, guild);
      if (!userRes.success || !userRes.value.member) {
        skippedCount++;
      } else {
        const res = await toggleRoleForMember(guild, userRes.value.member, targetRole, member);
        if (res === 'added') {
          addedCount++;
          affectedMembersList.push(userRes.value.member);
        } else if (res === 'removed') {
          removedCount++;
          affectedMembersList.push(userRes.value.member);
        } else {
          skippedCount++;
        }
      }
      processed++;
      if (tracker) {
        await tracker.update(processed, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`);
      }
    }

    if (tracker) {
      await tracker.update(totalUsers, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`, true);
    }

    let moveInfo = '';
    if (fmvResult.hasFmv && fmvResult.destVc) {
      const moveRes = await executeForceMove(affectedMembersList, fmvResult.destVc);
      moveInfo = `\n\n🔊 Moved **${moveRes.movedCount}** member(s) to **${fmvResult.destVc.name}**.`;
    }

    const finalPayload = buildV2Container({
      text: `✅ **URole Completed** (${mentionRole(targetRole.id)})`,
      sections: [`Added: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}${moveInfo}`],
    });

    if (statusMsg) {
      await statusMsg.edit({ content: undefined, components: finalPayload.components, flags: finalPayload.flags }).catch(() => {});
    } else {
      await respond.success(
        `Role update for ${mentionRole(targetRole.id)}:\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}${moveInfo}`,
      );
    }

    logEvent('info', 'command_execution', `URole toggle by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetRole: targetRole.name,
      addedCount,
      removedCount,
      skippedCount,
      hasFmv: fmvResult.hasFmv,
    });
  },
});

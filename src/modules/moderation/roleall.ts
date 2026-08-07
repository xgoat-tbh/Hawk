import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { toggleRoleForMember, extractForceMoveOption, executeForceMove } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import { LiveProgressTracker, renderProgressBar } from '../../core/utils/ProgressBar.js';

export default defineCommand({
  name: 'roleall',
  aliases: ['rall', 'massrole'],
  module: 'moderation',
  description: 'Toggle a role across all human or all bot accounts in the server, with optional force-move to a voice channel.',
  usage: 'roleall <human|bot> <role> [fmv <#vc>]',
  examples: ['roleall human @Members', 'roleall bot @BotRole', 'roleall human @Members fmv #Stage'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 10,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    const fmvResult = extractForceMoveOption(parsed.args, guild, member);
    if (fmvResult.error) {
      await respond.error(fmvResult.error);
      return;
    }

    const cleanArgs = fmvResult.cleanArgs;
    if (cleanArgs.length < 2) {
      await respond.error(`Usage: \`${parsed.prefix}roleall <human|bot> <role> [fmv <#vc>]\``);
      return;
    }

    const targetType = cleanArgs[0].toLowerCase();
    if (targetType !== 'human' && targetType !== 'bot' && targetType !== 'bots' && targetType !== 'humans') {
      await respond.error('Target population must be `human` or `bot`.');
      return;
    }

    const isBotTarget = targetType === 'bot' || targetType === 'bots';
    const roleRes = resolveRole(cleanArgs[1], guild);
    if (!roleRes.success) {
      await respond.error(`Role: ${roleRes.error}`);
      return;
    }

    const toggleRole = roleRes.value.role;

    // Fetch all guild members to ensure uncached members are loaded
    const allMembers = await guild.members.fetch().catch(() => guild.members.cache);
    const targetMembers = Array.from(allMembers.filter(m => isBotTarget ? m.user.bot : !m.user.bot).values());
    const totalMembers = targetMembers.length;

    if (totalMembers === 0) {
      await respond.info(`No ${isBotTarget ? 'bot' : 'human'} members found in this server.`);
      return;
    }

    // Send initial live progress message
    const initialPayload = buildV2Container({
      text: `⏳ **Processing RoleAll** (${mentionRole(toggleRole.id)} for ${isBotTarget ? 'bots' : 'humans'})`,
      sections: [`**Progress:** ${renderProgressBar(0, totalMembers)} (0/${totalMembers})\nAdded: **0** | Removed: **0** | Skipped: **0**`],
    });
    const statusMsg = await (ctx.channel as GuildTextBasedChannel).send(initialPayload).catch(() => null);
    const tracker = statusMsg ? new LiveProgressTracker(statusMsg, `RoleAll (${isBotTarget ? 'bots' : 'humans'})`, totalMembers) : null;

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;
    const affectedMembersList: import('discord.js').GuildMember[] = [];

    let processed = 0;
    for (const targetMember of targetMembers) {
      const res = await toggleRoleForMember(guild, targetMember, toggleRole, member);
      if (res === 'added') {
        addedCount++;
        affectedMembersList.push(targetMember);
      } else if (res === 'removed') {
        removedCount++;
        affectedMembersList.push(targetMember);
      } else {
        skippedCount++;
      }
      processed++;
      if (tracker) {
        await tracker.update(processed, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`);
      }
    }

    if (tracker) {
      await tracker.update(totalMembers, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`, true);
    }

    let moveInfo = '';
    if (fmvResult.hasFmv && fmvResult.destVc) {
      const moveRes = await executeForceMove(affectedMembersList, fmvResult.destVc);
      moveInfo = `\n\n🔊 Moved **${moveRes.movedCount}** member(s) to **${fmvResult.destVc.name}**.`;
    }

    const finalPayload = buildV2Container({
      text: `✅ **RoleAll Completed** (${mentionRole(toggleRole.id)} for ${isBotTarget ? 'bots' : 'humans'})`,
      sections: [`Added: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}${moveInfo}`],
    });

    if (statusMsg) {
      await statusMsg.edit({ content: undefined, components: finalPayload.components, flags: finalPayload.flags }).catch(() => {});
    } else {
      await respond.success(
        `RoleAll update (${mentionRole(toggleRole.id)} for ${isBotTarget ? 'bots' : 'humans'}):\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}${moveInfo}`,
      );
    }

    logEvent('info', 'command_execution', `RoleAll toggle by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetPopulation: isBotTarget ? 'bot' : 'human',
      toggleRole: toggleRole.name,
      addedCount,
      removedCount,
      skippedCount,
      hasFmv: fmvResult.hasFmv,
    });
  },
});

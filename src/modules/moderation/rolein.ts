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
  name: 'rolein',
  aliases: ['rin', 'rolemembers'],
  module: 'moderation',
  description: 'Toggle a role for all members who currently possess a target role, with optional force-move to a voice channel.',
  usage: 'rolein <target_population_role> <role_to_toggle> [fmv <#vc>]',
  examples: ['rolein @Members @VIP', 'rolein @Members @VIP fmv #General'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    const fmvResult = extractForceMoveOption(parsed.args, guild, member);
    if (fmvResult.error) {
      await respond.error(fmvResult.error);
      return;
    }

    const cleanArgs = fmvResult.cleanArgs;
    if (cleanArgs.length < 2) {
      await respond.error(`Usage: \`${parsed.prefix}rolein <target_population_role> <role_to_toggle> [fmv <#vc>]\``);
      return;
    }

    const popRoleRes = resolveRole(cleanArgs[0], guild);
    if (!popRoleRes.success) {
      await respond.error(`Population Role: ${popRoleRes.error}`);
      return;
    }

    const toggleRoleRes = resolveRole(cleanArgs[1], guild);
    if (!toggleRoleRes.success) {
      await respond.error(`Role to Toggle: ${toggleRoleRes.error}`);
      return;
    }

    const popRole = popRoleRes.value.role;
    const toggleRole = toggleRoleRes.value.role;

    // Fetch all guild members to ensure uncached members are loaded
    const allMembers = await guild.members.fetch().catch(() => guild.members.cache);
    const membersWithPopRole = Array.from(allMembers.filter(m => m.roles.cache.has(popRole.id)).values());
    const totalMembers = membersWithPopRole.length;

    if (totalMembers === 0) {
      await respond.info(`No members currently possess the role ${mentionRole(popRole.id)}.`);
      return;
    }

    // Send initial live progress message
    const initialPayload = buildV2Container({
      text: `⏳ **Processing RoleIn** (${mentionRole(toggleRole.id)} for ${mentionRole(popRole.id)})`,
      sections: [`**Progress:** ${renderProgressBar(0, totalMembers)} (0/${totalMembers})\nAdded: **0** | Removed: **0** | Skipped: **0**`],
    });
    const statusMsg = await (ctx.channel as GuildTextBasedChannel).send(initialPayload).catch(() => null);
    const tracker = statusMsg ? new LiveProgressTracker(statusMsg, `RoleIn (${popRole.name})`, totalMembers) : null;

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;
    const affectedMembersList: import('discord.js').GuildMember[] = [];

    let processed = 0;
    for (const targetMember of membersWithPopRole) {
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
      text: `✅ **RoleIn Completed** (${mentionRole(toggleRole.id)} for ${mentionRole(popRole.id)})`,
      sections: [`Added: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}${moveInfo}`],
    });

    if (statusMsg) {
      await statusMsg.edit({ content: undefined, components: finalPayload.components, flags: finalPayload.flags }).catch(() => {});
    } else {
      await respond.success(
        `RoleIn update (${mentionRole(toggleRole.id)} for members in ${mentionRole(popRole.id)}):\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}${moveInfo}`,
      );
    }

    logEvent('info', 'command_execution', `RoleIn toggle by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      popRole: popRole.name,
      toggleRole: toggleRole.name,
      addedCount,
      removedCount,
      skippedCount,
      hasFmv: fmvResult.hasFmv,
    });
  },
});

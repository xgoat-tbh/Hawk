import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { toggleRoleForMember, extractForceMoveOption, executeForceMove } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

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

    // Fetch members possessing popRole
    const membersWithPopRole = guild.members.cache.filter(m => m.roles.cache.has(popRole.id));

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;
    const affectedMembersList: import('discord.js').GuildMember[] = [];

    for (const [, targetMember] of membersWithPopRole) {
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
    }

    let moveInfo = '';
    if (fmvResult.hasFmv && fmvResult.destVc) {
      const moveRes = await executeForceMove(affectedMembersList, fmvResult.destVc);
      moveInfo = `\n\n🔊 Moved **${moveRes.movedCount}** member(s) to **${fmvResult.destVc.name}**.`;
    }

    await respond.success(
      `RoleIn update (${mentionRole(toggleRole.id)} for members in ${mentionRole(popRole.id)}):\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}${moveInfo}`,
    );

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

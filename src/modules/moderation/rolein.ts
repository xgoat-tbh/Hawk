import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { toggleRoleForMember } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'rolein',
  module: 'moderation',
  description: 'Toggle a role for all members who currently possess a target role.',
  usage: 'rolein <target_population_role> <role_to_toggle>',
  examples: ['rolein @Members @VIP'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    if (parsed.args.length < 2) {
      await respond.error('Usage: `?rolein <target_population_role> <role_to_toggle>`');
      return;
    }

    const popRoleRes = resolveRole(parsed.args[0], guild);
    if (!popRoleRes.success) {
      await respond.error(`Population Role: ${popRoleRes.error}`);
      return;
    }

    const toggleRoleRes = resolveRole(parsed.args[1], guild);
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

    for (const [, targetMember] of membersWithPopRole) {
      const res = await toggleRoleForMember(guild, targetMember, toggleRole, member);
      if (res === 'added') addedCount++;
      else if (res === 'removed') removedCount++;
      else skippedCount++;
    }

    await respond.success(
      `RoleIn update (${mentionRole(toggleRole.id)} for members in ${mentionRole(popRole.id)}):\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}`,
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
    });
  },
});

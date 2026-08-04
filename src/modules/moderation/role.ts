import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { toggleRoleForMember } from './roleHelpers.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'role',
  module: 'moderation',
  description: 'Toggle one or multiple roles for a target user.',
  usage: 'role <user> <roles...>',
  examples: ['role @User @Role', 'role @User @Role1 @Role2'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    if (parsed.args.length < 2) {
      await respond.error('Usage: `?role <user> <roles...>`');
      return;
    }

    const userRes = await resolveUser(parsed.args[0], guild);
    if (!userRes.success || !userRes.value.member) {
      const errMsg = !userRes.success ? userRes.error : 'Could not resolve member.';
      await respond.error(`User: ${errMsg}`);
      return;
    }

    const targetMember = userRes.value.member;
    const roleArgs = parsed.args.slice(1);

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;

    for (const roleArg of roleArgs) {
      const roleRes = resolveRole(roleArg, guild);
      if (!roleRes.success) {
        skippedCount++;
        continue;
      }

      const res = await toggleRoleForMember(guild, targetMember, roleRes.value.role, member);
      if (res === 'added') addedCount++;
      else if (res === 'removed') removedCount++;
      else skippedCount++;
    }

    await respond.success(
      `Role update for ${mentionUser(targetMember.id)}:\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}`,
    );

    logEvent('info', 'command_execution', `Role toggle by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetUser: targetMember.user.tag,
      addedCount,
      removedCount,
      skippedCount,
    });
  },
});

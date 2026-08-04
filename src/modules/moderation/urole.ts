import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { toggleRoleForMember } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'urole',
  module: 'moderation',
  description: 'Toggle ONE role across MULTIPLE users.',
  usage: 'urole <role> <users...>',
  examples: ['urole @Role @User1 @User2 @User3'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    if (parsed.args.length < 2) {
      await respond.error('Usage: `?urole <role> <users...>`');
      return;
    }

    const roleRes = resolveRole(parsed.args[0], guild);
    if (!roleRes.success) {
      await respond.error(`Role: ${roleRes.error}`);
      return;
    }

    const targetRole = roleRes.value.role;
    const userArgs = parsed.args.slice(1);

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;

    for (const userArg of userArgs) {
      const userRes = await resolveUser(userArg, guild);
      if (!userRes.success || !userRes.value.member) {
        skippedCount++;
        continue;
      }

      const res = await toggleRoleForMember(guild, userRes.value.member, targetRole, member);
      if (res === 'added') addedCount++;
      else if (res === 'removed') removedCount++;
      else skippedCount++;
    }

    await respond.success(
      `Role update for ${mentionRole(targetRole.id)}:\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}`,
    );

    logEvent('info', 'command_execution', `URole toggle by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetRole: targetRole.name,
      addedCount,
      removedCount,
      skippedCount,
    });
  },
});

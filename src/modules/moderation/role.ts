import { PermissionsBitField } from 'discord.js';
import type { GuildMember } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { toggleRoleForMember } from './roleHelpers.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'role',
  aliases: ['r', 'addrole', 'giverole'],
  module: 'moderation',
  description: 'Toggle one or multiple roles for a target user (or replied user/self).',
  usage: 'role [user] <roles...>',
  examples: ['role @Role', 'role @User @Role', 'role @User @Role1 @Role2'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member, replyTarget } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}role [user] <roles...>\` or reply to a user's message.`);
      return;
    }

    let targetMember: GuildMember | null = null;
    let roleArgs: string[] = [];

    // Attempt resolving first arg as user
    const userRes = await resolveUser(parsed.args[0], guild);
    if (userRes.success && userRes.value.member) {
      targetMember = userRes.value.member;
      roleArgs = parsed.args.slice(1);
    } else {
      // First arg is not a user -> default to replied user or command invoker
      targetMember = replyTarget ?? member;
      roleArgs = parsed.args;
    }

    if (!targetMember) {
      await respond.error('Could not resolve target member.');
      return;
    }

    if (roleArgs.length === 0) {
      await respond.error(`Specify at least one role to toggle. Usage: \`${parsed.prefix}role [user] <roles...>\`.`);
      return;
    }

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

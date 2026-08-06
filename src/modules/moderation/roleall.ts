import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { toggleRoleForMember } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'roleall',
  aliases: ['rall', 'massrole'],
  module: 'moderation',
  description: 'Toggle a role across all human or all bot accounts in the server.',
  usage: 'roleall <human|bot> <role>',
  examples: ['roleall human @Members', 'roleall bot @BotRole'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 10,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    if (parsed.args.length < 2) {
      await respond.error('Usage: `?roleall <human|bot> <role>`');
      return;
    }

    const targetType = parsed.args[0].toLowerCase();
    if (targetType !== 'human' && targetType !== 'bot' && targetType !== 'bots' && targetType !== 'humans') {
      await respond.error('Target population must be `human` or `bot`.');
      return;
    }

    const isBotTarget = targetType === 'bot' || targetType === 'bots';
    const roleRes = resolveRole(parsed.args[1], guild);
    if (!roleRes.success) {
      await respond.error(`Role: ${roleRes.error}`);
      return;
    }

    const toggleRole = roleRes.value.role;
    const targetMembers = guild.members.cache.filter(m => isBotTarget ? m.user.bot : !m.user.bot);

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;

    for (const [, targetMember] of targetMembers) {
      const res = await toggleRoleForMember(guild, targetMember, toggleRole, member);
      if (res === 'added') addedCount++;
      else if (res === 'removed') removedCount++;
      else skippedCount++;
    }

    await respond.success(
      `RoleAll update (${mentionRole(toggleRole.id)} for ${isBotTarget ? 'bots' : 'humans'}):\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}`,
    );

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
    });
  },
});

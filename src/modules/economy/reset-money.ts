import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resetUser, logAuditAction } from './economyService.js';

export default defineCommand({
  name: 'reset-money',
  aliases: ['resetbal'],
  module: 'economy',
  description: 'Reset your own balance, or a mentioned user\'s balance (requires Admin)',
  usage: 'reset-money [@user]',
  examples: ['reset-money', 'reset-money @User'],
  permissions: [],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    const mentionToken = ctx.parsed.tokens.find(t => t.type === 'mention_user');
    let targetId = ctx.message.author.id;

    if (mentionToken && mentionToken.value) {
      if (!ctx.member.permissions.has('ManageGuild')) {
        await ctx.respond.error('You do not have permission to reset other users\' balances.');
      }
      targetId = mentionToken.value;
    }

    if (targetId === ctx.message.author.id) {
      // Basic confirmation check could go here if interactive, but for now we execute
      await resetUser(ctx.guild.id, targetId);
      await logAuditAction(ctx.guild.id, ctx.message.author.id, targetId, 'reset', 0, 'Self-reset balance');
      await ctx.respond.success('Your balance has been reset to starting values.');
    } else {
      await resetUser(ctx.guild.id, targetId);
      await logAuditAction(ctx.guild.id, ctx.message.author.id, targetId, 'reset', 0, 'Admin reset balance');
      await ctx.respond.success(`Successfully reset <@${targetId}>'s balance.`);
    }
  },
});

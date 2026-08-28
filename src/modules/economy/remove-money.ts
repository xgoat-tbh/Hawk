import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { removeCash, removeBank, logAuditAction } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'remove-money',
  aliases: ['removebal'],
  module: 'economy',
  description: 'Remove money from a user',
  usage: 'remove-money <@user> <amount> [cash|bank]',
  examples: ['remove-money @User 1000', 'remove-money @User 1000 bank'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 0,
  async execute(ctx: CommandContext): Promise<void> {
    const mentionToken = ctx.parsed.tokens.find(t => t.type === 'mention_user');
    if (!mentionToken || !mentionToken.value) {
      await ctx.respond.error('Please mention a user.');
      return;
    }
    const targetId = mentionToken.value;

    const args = ctx.parsed.args.filter(a => !a.includes('<@'));
    const amount = parseInt(args[0], 10);
    const dest = args[1]?.toLowerCase() === 'bank' ? 'bank' : 'cash';

    if (isNaN(amount) || amount <= 0) {
      await ctx.respond.error('Please provide a valid positive amount.');
      return;
    }

    const config = await getEconomyConfig(ctx.guild.id);

    if (dest === 'bank') {
      await removeBank(ctx.guild.id, targetId, amount);
    } else {
      await removeCash(ctx.guild.id, targetId, amount);
    }

    await logAuditAction(ctx.guild.id, ctx.message.author.id, targetId, 'remove', amount, `Removed from ${dest}`);
    await ctx.respond.success(`Successfully removed **${config.currencySymbol}${amount.toLocaleString()}** from <@${targetId}>'s ${dest}.`);
  },
});

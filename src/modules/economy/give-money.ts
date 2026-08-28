import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { transferCash, getBalance, logAuditAction } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'give-money',
  aliases: ['give'],
  module: 'economy',
  description: 'Give cash to another user',
  usage: 'give-money <@user> <amount>',
  examples: ['give-money @User 100'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const mentionToken = ctx.parsed.tokens.find(t => t.type === 'mention_user');
    if (!mentionToken || !mentionToken.value) {
      await ctx.respond.error('Please mention a user to give money to.');
      return;
    }
    
    const targetId = mentionToken.value;
    if (targetId === ctx.message.author.id) {
      await ctx.respond.error('You cannot give money to yourself.');
      return;
    }

    const amountStr = ctx.parsed.args.find(arg => !arg.includes('<@'));
    const amount = parseInt(amountStr || '', 10);

    if (isNaN(amount) || amount <= 0) {
      await ctx.respond.error('Please provide a valid positive amount.');
      return;
    }

    const config = await getEconomyConfig(ctx.guild.id);
    const senderBalance = await getBalance(ctx.guild.id, ctx.message.author.id);
    
    if (amount > senderBalance.cash) {
      await ctx.respond.error('You do not have enough cash.');
      return;
    }

    await transferCash(ctx.guild.id, ctx.message.author.id, targetId, amount);
    await logAuditAction(ctx.guild.id, ctx.message.author.id, targetId, 'transfer', amount, 'Given via give-money command');
    
    await ctx.respond.success(`Successfully gave **${config.currencySymbol}${amount.toLocaleString()}** to <@${targetId}>.`);
  },
});

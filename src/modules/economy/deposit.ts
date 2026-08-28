import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { deposit, getBalance } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'deposit',
  aliases: ['dep'],
  module: 'economy',
  description: 'Deposit cash into your bank',
  usage: 'deposit <amount|all>',
  examples: ['deposit 100', 'deposit all'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const amountStr = ctx.parsed.args[0]?.toLowerCase();
    if (!amountStr) {
      await ctx.respond.error('Please specify an amount to deposit or "all".');
    }

    const config = await getEconomyConfig(ctx.guild.id);
    const balance = await getBalance(ctx.guild.id, ctx.message.author.id);
    
    let amount = 0;
    if (amountStr === 'all') {
      const space = balance.bankCapacity - balance.bank;
      amount = Math.min(balance.cash, space);
    } else {
      amount = parseInt(amountStr, 10);
    }

    if (isNaN(amount) || amount <= 0) {
      await ctx.respond.error('Please provide a valid positive number.');
    }

    if (amount > balance.cash) {
      await ctx.respond.error('You do not have that much cash.');
    }

    if (balance.bank + amount > balance.bankCapacity) {
      await ctx.respond.error('Your bank cannot hold that much.');
    }

    await deposit(ctx.guild.id, ctx.message.author.id, amount);
    await ctx.respond.success(`Successfully deposited **${config.currencySymbol}${amount.toLocaleString()}** into your bank.`);
  },
});

import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { withdraw, getBalance } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'withdraw',
  aliases: ['with'],
  module: 'economy',
  description: 'Withdraw money from your bank to cash',
  usage: 'withdraw <amount|all>',
  examples: ['withdraw 100', 'withdraw all'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const amountStr = ctx.parsed.args[0]?.toLowerCase();
    if (!amountStr) {
      await ctx.respond.error('Please specify an amount to withdraw or "all".');
    }

    const config = await getEconomyConfig(ctx.guild.id);
    const balance = await getBalance(ctx.guild.id, ctx.message.author.id);
    
    let amount = 0;
    if (amountStr === 'all') {
      amount = balance.bank;
    } else {
      amount = parseInt(amountStr, 10);
    }

    if (isNaN(amount) || amount <= 0) {
      await ctx.respond.error('Please provide a valid positive number.');
    }

    if (amount > balance.bank) {
      await ctx.respond.error('You do not have that much in your bank.');
    }

    await withdraw(ctx.guild.id, ctx.message.author.id, amount);
    await ctx.respond.success(`Successfully withdrew **${config.currencySymbol}${amount.toLocaleString()}** from your bank.`);
  },
});

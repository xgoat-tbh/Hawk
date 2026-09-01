import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { withdraw, getBalance } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { parseAmount } from './economyUtils.js';

export default defineCommand({
  name: 'withdraw',
  aliases: ['with'],
  module: 'economy',
  description: 'Withdraw money from your bank to cash',
  usage: 'withdraw <amount|all>',
  examples: ['withdraw 100', 'withdraw 1e6', 'withdraw all'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const amountStr = ctx.parsed.args[0]?.toLowerCase();
    if (!amountStr) {
      await ctx.respond.error('Please specify an amount to withdraw or "all".');
      return;
    }

    const config = await getEconomyConfig(ctx.guild.id);
    const balance = await getBalance(ctx.guild.id, ctx.message.author.id);
    
    let amount = 0;
    if (amountStr === 'all' || amountStr === 'max') {
      amount = balance.bank;
    } else {
      const parsed = parseAmount(amountStr);
      if (!parsed || parsed <= 0) {
        await ctx.respond.error('Please provide a valid positive number (e.g. `100`, `1e6`, `50k`, `all`).');
        return;
      }
      amount = parsed;
    }

    if (amount <= 0) {
      await ctx.respond.error('You do not have any money in your bank.');
      return;
    }

    if (amount > balance.bank) {
      await ctx.respond.error('You do not have that much in your bank.');
      return;
    }

    try {
      const { withdrawn } = await withdraw(ctx.guild.id, ctx.message.author.id, amount);
      await ctx.respond.success(`Successfully withdrew **${config.currencySymbol}${withdrawn.toLocaleString()}** from your bank.`);
    } catch (err: any) {
      await ctx.respond.error(err.message || 'Failed to withdraw.');
    }
  },
});

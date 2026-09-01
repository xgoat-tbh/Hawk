import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { transferCash, getBalance, logAuditAction } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { parseAmount } from './economyUtils.js';

export default defineCommand({
  name: 'give-money',
  aliases: ['give'],
  module: 'economy',
  description: 'Give cash to another user',
  usage: 'give-money <@user> <amount>',
  examples: ['give-money @User 100', 'give-money @User 1e6', 'give-money @User 50k'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.parsed.args.length < 2) {
      await ctx.respond.error('Usage: `give-money <@user> <amount>`');
      return;
    }

    let targetId: string | null = null;
    let amountStr: string = '';

    // Check if first argument is amount and second is user
    const parsedAmount0 = parseAmount(ctx.parsed.args[0]);
    if (parsedAmount0 !== null && ctx.parsed.args.length >= 2) {
      const resolved = await resolveUser(ctx.parsed.args[1], ctx.guild);
      if (resolved.success) {
        targetId = resolved.value.id;
        amountStr = ctx.parsed.args[0];
      }
    }

    if (!targetId) {
      const resolved = await resolveUser(ctx.parsed.args[0], ctx.guild);
      if (!resolved.success) {
        await ctx.respond.error(resolved.error);
        return;
      }
      targetId = resolved.value.id;
      amountStr = ctx.parsed.args[1];
    }
    
    if (targetId === ctx.message.author.id) {
      await ctx.respond.error('You cannot give money to yourself.');
      return;
    }

    const amount = parseAmount(amountStr);
    if (!amount || amount <= 0) {
      await ctx.respond.error('Please provide a valid positive amount (e.g. `100`, `1e6`, `50k`).');
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

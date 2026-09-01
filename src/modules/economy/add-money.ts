import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { addCash, addBank, logAuditAction } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { parseAmount } from './economyUtils.js';

export default defineCommand({
  name: 'add-money',
  aliases: ['addbal'],
  module: 'economy',
  description: 'Add money to a user',
  usage: 'add-money <@user> <amount> [cash|bank]',
  examples: ['add-money @User 1000', 'add-money @User 1e9', 'add-money @User 500k bank'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 0,
  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.parsed.args.length < 2) {
      await ctx.respond.error('Usage: `add-money <@user> <amount> [cash|bank]`');
      return;
    }

    let targetId: string | null = null;
    let amountStr: string = '';
    let destArg: string = '';

    // Check if first argument is amount and second is user
    const parsedAmount0 = parseAmount(ctx.parsed.args[0]);
    if (parsedAmount0 !== null && ctx.parsed.args.length >= 2) {
      const resolved = await resolveUser(ctx.parsed.args[1], ctx.guild);
      if (resolved.success) {
        targetId = resolved.value.id;
        amountStr = ctx.parsed.args[0];
        destArg = ctx.parsed.args[2] || '';
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
      destArg = ctx.parsed.args[2] || '';
    }

    const amount = parseAmount(amountStr);
    if (!amount || amount <= 0) {
      await ctx.respond.error('Please provide a valid positive amount (e.g. `1000`, `1e9`, `500k`, `2.5m`).');
      return;
    }

    const dest = destArg.toLowerCase() === 'bank' ? 'bank' : 'cash';
    const config = await getEconomyConfig(ctx.guild.id);

    if (dest === 'bank') {
      await addBank(ctx.guild.id, targetId, amount);
    } else {
      await addCash(ctx.guild.id, targetId, amount);
    }

    await logAuditAction(ctx.guild.id, ctx.message.author.id, targetId, 'add', amount, `Added to ${dest}`);
    await ctx.respond.success(`Successfully added **${config.currencySymbol}${amount.toLocaleString()}** to <@${targetId}>'s ${dest}.`);
  },
});

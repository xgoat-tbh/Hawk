import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, sellItem } from './storeService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'sell-item',
  aliases: ['sell'],
  module: 'store',
  description: 'Sell an item from your inventory for 50% of its price',
  usage: 'sell-item <item name or ID> [quantity]',
  examples: ['sell-item 1', 'sell-item VIP 2'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.parsed.args.length === 0) {
      await ctx.respond.error('Please provide an item name or ID.');
      return;
    }

    const lastArg = parseInt(ctx.parsed.args[ctx.parsed.args.length - 1]);
    let quantity = 1;
    let queryArgs = ctx.parsed.args;

    if (!isNaN(lastArg) && lastArg > 0 && ctx.parsed.args.length > 1) {
      quantity = lastArg;
      queryArgs = ctx.parsed.args.slice(0, -1);
    }
    
    const query = queryArgs.join(' ');

    const item = await getItem(ctx.guild.id, query);
    if (!item) {
      await ctx.respond.error('Item not found.');
      return;
    }

    try {
      const { refund } = await sellItem(ctx.guild.id, ctx.message.author.id, item.itemId, quantity);
      const config = await getEconomyConfig(ctx.guild.id);
      const currency = config?.currencySymbol || '$';
      await ctx.respond.success(`You successfully sold ${quantity}x **${item.name}** for ${currency}${refund}.`);
    } catch (err: any) {
      await ctx.respond.error(err.message || 'Failed to sell item.');
    }
  },
});


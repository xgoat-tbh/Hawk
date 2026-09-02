import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, buyItem } from './storeService.js';
import { ensureBalance } from '../economy/economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'buy-item',
  aliases: ['buy'],
  module: 'store',
  description: 'Buy an item from the store',
  usage: 'buy-item <item name or ID> [quantity]',
  examples: ['buy-item 1', 'buy-item VIP 2'],
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
      // Maybe the user just entered an ID and quantity? Let's check if there's only 1 arg or fallback.
      await ctx.respond.error('Item not found.');
      return;
    }

    await ensureBalance(ctx.guild.id, ctx.message.author.id);
    
    try {
      await buyItem(ctx.guild.id, ctx.message.author.id, item.itemId, quantity);
      
      let roleAssigned = false;
      if (item.inventoryRoleId && ctx.member) {
        try {
          await ctx.member.roles.add(item.inventoryRoleId);
          roleAssigned = true;
        } catch {
          // Bot may lack role hierarchy permissions
        }
      }

      const config = await getEconomyConfig(ctx.guild.id);
      const currency = config?.currencySymbol || '$';
      const roleText = roleAssigned ? ` and was granted <@&${item.inventoryRoleId}>` : '';
      await ctx.respond.success(`Purchased **${quantity}x ${item.name}** for **${currency}${(item.price * quantity).toLocaleString()}**${roleText}.`);
    } catch (err: any) {
      await ctx.respond.error(err.message || 'Failed to complete store purchase.');
    }
  },
});


import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, deleteItem } from './storeService.js';

export default defineCommand({
  name: 'delete-item',
  aliases: ['deleteitem', 'delitem'],
  module: 'store',
  description: 'Delete an item from the store',
  usage: 'delete-item <item name or ID>',
  examples: ['delete-item 1', 'delete-item VIP'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const query = ctx.parsed.args.join(' ');
    if (!query) {
      await ctx.respond.error('Please provide an item name or ID.');
      return;
    }

    const item = await getItem(ctx.guild.id, query);
    if (!item) {
      await ctx.respond.error('Item not found.');
      return;
    }

    try {
      const deleted = await deleteItem(ctx.guild.id, item.itemId);
      if (deleted) {
        await ctx.respond.success(`Deleted item **${item.name}** (ID: ${item.itemId}).`);
      } else {
        await ctx.respond.error('Failed to delete item.');
      }
    } catch (err: any) {
      await ctx.respond.error(err.message || 'Failed to delete item.');
    }
  },
});


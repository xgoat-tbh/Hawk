import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, useItem } from './storeService.js';

export default defineCommand({
  name: 'use-item',
  aliases: ['use'],
  module: 'store',
  description: 'Use an item from your inventory',
  usage: 'use-item <item name or ID>',
  examples: ['use-item VIP'],
  permissions: [],
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

    if (!ctx.member) {
      await ctx.respond.error('You must use this command in a server.');
      return;
    }

    try {
      const result = await useItem(ctx.guild.id, ctx.message.author.id, item.itemId, ctx.member as any);
      let msg = `You used 1x **${item.name}**!`;
      if (result.roleGranted) {
        msg += `\nYou were granted the <@&${item.inventoryRoleId}> role!`;
      }
      await ctx.respond.success(msg);
    } catch (err: any) {
      await ctx.respond.error(err.message || 'Failed to use item.');
    }
  },
});


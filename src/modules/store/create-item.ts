import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { createItem } from './storeService.js';

export default defineCommand({
  name: 'create-item',
  aliases: ['createitem'],
  module: 'store',
  description: 'Create a new item in the store',
  usage: 'create-item <price> <name> | <description> [@role]',
  examples: ['create-item 1000 VIP | Very cool VIP role @VIPRole'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const rawArgs = ctx.parsed.args.join(' ');
    
    // Format: <price> <name> | <description> [@role]
    const parts = rawArgs.split('|');
    if (parts.length < 2) {
      await ctx.respond.error('Invalid format. Usage: `create-item <price> <name> | <description> [@role]`');
      return;
    }

    const leftPart = parts[0].trim().split(' ');
    const priceRaw = leftPart.shift();
    if (!priceRaw) {
      await ctx.respond.error('Please specify a price.');
      return;
    }
    const price = parseInt(priceRaw);
    if (isNaN(price) || price < 0) {
      await ctx.respond.error('Price must be a valid positive number.');
      return;
    }

    const name = leftPart.join(' ').trim();
    if (!name) {
      await ctx.respond.error('Please specify an item name.');
      return;
    }

    let rightPart = parts.slice(1).join('|').trim();
    const roleMention = ctx.message.mentions.roles.first();
    let inventoryRoleId = null;
    
    if (roleMention) {
      inventoryRoleId = roleMention.id;
      // Remove mention from description
      rightPart = rightPart.replace(`<@&${roleMention.id}>`, '').trim();
    }

    const description = rightPart;
    if (!description) {
      await ctx.respond.error('Please specify a description.');
      return;
    }

    try {
      const item = await createItem(ctx.guild.id, name, price, description, inventoryRoleId);
      await ctx.respond.success(`Created item **${item.name}** (ID: ${item.itemId}) for $${item.price}.`);
    } catch (err: any) {
      await ctx.respond.error(err.message || 'Failed to create item.');
    }
  },
});


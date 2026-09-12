import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, updateItem } from './storeService.js';

export default defineCommand({
  name: 'edit-item',
  aliases: ['edititem'],
  module: 'store',
  description: 'Edit a store item\'s properties (price, name, stock, usable, sellable, description)',
  usage: 'edit-item <item_id> <price|name|stock|usable|sellable|description> <new_value>',
  examples: [
    'edit-item 1 price 2500',
    'edit-item 1 stock 50',
    'edit-item 1 usable false',
    'edit-item 1 name Supreme VIP',
  ],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, parsed, respond } = ctx;

    if (parsed.args.length < 3) {
      await respond.error(`Usage: \`${parsed.prefix}edit-item <item_id> <price|name|stock|usable|sellable|description> <value>\``);
      return;
    }

    const itemIdRaw = parseInt(parsed.args[0], 10);
    if (isNaN(itemIdRaw)) {
      await respond.error('Please specify a valid item ID number as the first argument.');
      return;
    }

    const item = await getItem(guild.id, String(itemIdRaw));
    if (!item) {
      await respond.error(`Item with ID \`${itemIdRaw}\` was not found.`);
      return;
    }

    const property = parsed.args[1].toLowerCase();
    const rawVal = parsed.args.slice(2).join(' ');

    const updates: Parameters<typeof updateItem>[2] = {};

    switch (property) {
      case 'price': {
        let price: number;
        if (rawVal.toLowerCase().includes('e')) {
          price = Math.floor(Number(rawVal));
        } else {
          price = parseInt(rawVal, 10);
        }
        if (isNaN(price) || price < 0) {
          await respond.error('Price must be a valid number >= 0.');
          return;
        }
        updates.price = price;
        break;
      }
      case 'name':
        if (!rawVal.trim()) {
          await respond.error('Item name cannot be empty.');
          return;
        }
        updates.name = rawVal.trim();
        break;
      case 'stock': {
        const stock = parseInt(rawVal, 10);
        if (isNaN(stock) || stock < -1) {
          await respond.error('Stock must be a number >= -1 (-1 represents unlimited).');
          return;
        }
        updates.stock = stock;
        break;
      }
      case 'usable':
        updates.usable = ['true', 'yes', '1', 'on'].includes(rawVal.toLowerCase());
        break;
      case 'sellable':
        updates.sellable = ['true', 'yes', '1', 'on'].includes(rawVal.toLowerCase());
        break;
      case 'description':
      case 'desc':
        updates.description = rawVal.trim();
        break;
      default:
        await respond.error('Invalid property! Supported properties: `price`, `name`, `stock`, `usable`, `sellable`, `description`.');
        return;
    }

    try {
      const updated = await updateItem(guild.id, item.itemId, updates);
      if (!updated) {
        await respond.error('Failed to update item: item no longer exists.');
        return;
      }
      await respond.success(`Successfully updated **${updated.name}** (ID: \`${updated.itemId}\`): set **${property}** to \`${rawVal}\`.`);
    } catch (err: any) {
      await respond.error(err.message || 'Failed to update item.');
    }
  },
});

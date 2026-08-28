import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, takeItem } from './storeService.js';

export default defineCommand({
  name: 'take-item',
  aliases: ['takeitem'],
  module: 'store',
  description: 'Take an item from a user\'s inventory',
  usage: 'take-item <@user> <item name or ID> [quantity]',
  examples: ['take-item @user VIP 1'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const target = ctx.message.mentions.users.first();
    if (!target) {
      await ctx.respond.error('Please mention a user.');
      return;
    }

    const argsWithoutMention = ctx.parsed.args.filter(arg => !arg.includes(target.id));
    if (argsWithoutMention.length === 0) {
      await ctx.respond.error('Please provide an item name or ID.');
      return;
    }

    const lastArg = parseInt(argsWithoutMention[argsWithoutMention.length - 1]);
    let quantity = 1;
    let queryArgs = argsWithoutMention;

    if (!isNaN(lastArg) && lastArg > 0 && argsWithoutMention.length > 1) {
      quantity = lastArg;
      queryArgs = argsWithoutMention.slice(0, -1);
    }
    
    const query = queryArgs.join(' ');
    const item = await getItem(ctx.guild.id, query);
    if (!item) {
      await ctx.respond.error('Item not found.');
      return;
    }

    try {
      const success = await takeItem(ctx.guild.id, target.id, item.itemId, quantity);
      if (success) {
        await ctx.respond.success(`Took ${quantity}x **${item.name}** from ${target.username}'s inventory.`);
      } else {
        await ctx.respond.error(`${target.username} does not have enough of that item.`);
      }
    } catch (err: any) {
      await ctx.respond.error(err.message || 'Failed to take item.');
    }
  },
});


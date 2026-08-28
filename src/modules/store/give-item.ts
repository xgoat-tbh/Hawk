import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, giveItem } from './storeService.js';

export default defineCommand({
  name: 'give-item',
  aliases: ['giveitem'],
  module: 'store',
  description: 'Give an item to another user',
  usage: 'give-item <@user> <item name or ID> [quantity]',
  examples: ['give-item @user VIP 2'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const target = ctx.message.mentions.users.first();
    if (!target) {
      await ctx.respond.error('Please mention a user.');
      return;
    }

    if (target.bot) {
      await ctx.respond.error('You cannot give items to bots.');
      return;
    }

    if (target.id === ctx.message.author.id) {
      await ctx.respond.error('You cannot give items to yourself.');
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
      await giveItem(ctx.guild.id, ctx.message.author.id, target.id, item.itemId, quantity);
      await ctx.respond.success(`You gave ${quantity}x **${item.name}** to ${target.username}.`);
    } catch (err: any) {
      await ctx.respond.error(err.message || 'Failed to give item.');
    }
  },
});


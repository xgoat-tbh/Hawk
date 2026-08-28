import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, spawnItem } from './storeService.js';

export default defineCommand({
  name: 'spawn-item',
  aliases: ['spawnitem'],
  module: 'store',
  description: 'Spawn an item directly into a user\'s inventory without charging them',
  usage: 'spawn-item <@user> <item name or ID> [quantity]',
  examples: ['spawn-item @user VIP 2'],
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
      await spawnItem(ctx.guild.id, target.id, item.itemId, quantity);
      await ctx.respond.success(`Spawned ${quantity}x **${item.name}** into ${target.username}'s inventory.`);
    } catch (err: any) {
      await ctx.respond.error(err.message || 'Failed to spawn item.');
    }
  },
});


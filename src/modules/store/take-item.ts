import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, adminTakeItem } from './storeService.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';

export default defineCommand({
  name: 'take-item',
  aliases: ['takeitem'],
  module: 'store',
  description: 'Take an item from a user\'s inventory (Staff only)',
  usage: 'take-item <@user> <item name or ID> [quantity]',
  examples: ['take-item @user VIP 1', 'take-item @user 3'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, member, parsed, respond } = ctx;

    if (parsed.args.length < 2) {
      await respond.error(`Usage: \`${parsed.prefix}take-item <@user> <item name or ID> [quantity]\``);
      return;
    }

    const resolvedTarget = await resolveUser(parsed.args[0], guild);
    if (!resolvedTarget.success || !resolvedTarget.value.member) {
      await respond.error('Please specify a valid member in the server.');
      return;
    }
    const target = resolvedTarget.value.member;

    const remainingArgs = parsed.args.slice(1);
    const lastArg = parseInt(remainingArgs[remainingArgs.length - 1], 10);
    let quantity = 1;
    let queryArgs = remainingArgs;

    if (!isNaN(lastArg) && lastArg > 0 && remainingArgs.length > 1) {
      quantity = lastArg;
      queryArgs = remainingArgs.slice(0, -1);
    }

    const query = queryArgs.join(' ');
    const item = await getItem(guild.id, query);
    if (!item) {
      await respond.error(`Item \`${query}\` was not found in the store.`);
      return;
    }

    try {
      const { removed } = await adminTakeItem(guild.id, target.id, item.itemId, quantity, member.id);
      await respond.success(`Successfully removed **${removed}x ${item.name}** from <@${target.id}>'s inventory.`);
    } catch (err: any) {
      await respond.error(err.message || 'Failed to remove item from inventory.');
    }
  },
});

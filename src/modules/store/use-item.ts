import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, useItem } from './storeService.js';
import { PermissionsBitField } from 'discord.js';

export default defineCommand({
  name: 'use-item',
  aliases: ['use'],
  module: 'store',
  description: 'Use an item from your inventory to trigger its effects or roles.',
  usage: 'use-item <item name or ID>',
  examples: ['use-item 1', 'use VIP Pass'],
  permissions: [],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, member, parsed, respond } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}use-item <item name or ID>\``);
      return;
    }

    const query = parsed.args.join(' ');
    const item = await getItem(guild.id, query);
    if (!item) {
      await respond.error(`Item \`${query}\` was not found in the store.`);
      return;
    }

    try {
      const result = await useItem(guild.id, member.id, item.itemId, member);

      let msg = `Successfully used **${item.name}**!`;
      if (result.replyMessage) {
        msg = `${result.replyMessage}`;
      } else if (result.roleGivenSuccess || result.roleRemovedSuccess) {
        const parts: string[] = [];
        if (result.roleGivenSuccess && (item.roleGiven || item.inventoryRoleId)) {
          parts.push(`granted role <@&${item.roleGiven || item.inventoryRoleId}>`);
        }
        if (result.roleRemovedSuccess && item.roleRemoved) {
          parts.push(`removed role <@&${item.roleRemoved}>`);
        }
        if (parts.length > 0) {
          msg += ` (${parts.join(', ')})`;
        }
      }

      await respond.success(msg);
    } catch (err: any) {
      await respond.error(err.message || 'Failed to use item.');
    }
  },
});

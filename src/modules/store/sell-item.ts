import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionsBitField,
} from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItem, sellItem, getInventory } from './storeService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'sell-item',
  aliases: ['sell'],
  module: 'store',
  description: 'Sell an item from your inventory back for cash with confirmation.',
  usage: 'sell-item <item name or ID> [quantity]',
  examples: ['sell-item 1', 'sell-item Dragon Sword 2'],
  permissions: [],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, member, parsed, respond, channel } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}sell-item <item name or ID> [quantity]\``);
      return;
    }

    const lastArg = parseInt(parsed.args[parsed.args.length - 1], 10);
    let quantity = 1;
    let queryArgs = parsed.args;

    if (!isNaN(lastArg) && lastArg > 0 && parsed.args.length > 1) {
      quantity = lastArg;
      queryArgs = parsed.args.slice(0, -1);
    }

    const query = queryArgs.join(' ');
    const item = await getItem(guild.id, query);
    if (!item) {
      await respond.error(`Item \`${query}\` was not found in the store.`);
      return;
    }

    if (!item.sellable) {
      await respond.error(`**${item.name}** cannot be sold back.`);
      return;
    }

    // Verify inventory ownership
    const inv = await getInventory(guild.id, member.id);
    const owned = inv.find((e) => e.itemId === item.itemId);
    if (!owned || owned.quantity < quantity) {
      await respond.error(`You do not have ${quantity}x **${item.name}** in your inventory.`);
      return;
    }

    const config = await getEconomyConfig(guild.id);
    const currency = config?.currencySymbol || '$';
    const estimatedRefund = Math.floor((item.price * quantity) / 2);

    // Interactive confirmation prompt
    const confirmId = `sell_confirm_${member.id}_${Date.now()}`;
    const cancelId = `sell_cancel_${member.id}_${Date.now()}`;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(confirmId).setLabel('Confirm Sale').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(cancelId).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const promptMsg = await channel.send({
      content: `⚠️ <@${member.id}>, are you sure you want to sell **${quantity}x ${item.name}** for **${currency}${estimatedRefund.toLocaleString()}** (50% value)?`,
      components: [row],
    });

    try {
      const confirmation = await promptMsg.awaitMessageComponent({
        filter: (i) => i.user.id === member.id && (i.customId === confirmId || i.customId === cancelId),
        componentType: ComponentType.Button,
        time: 45_000,
      });

      if (confirmation.customId === confirmId) {
        try {
          const result = await sellItem(guild.id, member.id, item.itemId, quantity);
          await confirmation.update({
            content: `✅ Sold **${quantity}x ${item.name}** for **${currency}${result.refund.toLocaleString()}**! Added to your wallet.`,
            components: [],
          });
        } catch (err: any) {
          await confirmation.update({
            content: `❌ Error completing sale: ${err.message}`,
            components: [],
          });
        }
      } else {
        await confirmation.update({
          content: '❌ Sale cancelled.',
          components: [],
        });
      }
    } catch {
      // Timeout
      await promptMsg.edit({
        content: '⏱️ Sale confirmation timed out.',
        components: [],
      }).catch(() => {});
    }
  },
});

import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getInventory } from './storeService.js';
import { buildInventoryEmbed } from './storeUI.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'inventory',
  aliases: ['inv', 'bag'],
  module: 'store',
  description: 'Shows your inventory',
  usage: 'inventory',
  examples: ['inventory'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const entries = await getInventory(ctx.guild.id, ctx.message.author.id);
    const config = await getEconomyConfig(ctx.guild.id);
    const currency = config?.currencySymbol || '$';

    const embed = buildInventoryEmbed(entries, ctx.message.author.username, currency);
    await ctx.respond.raw({ embeds: [embed] });
  },
});


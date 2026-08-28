import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItems } from './storeService.js';
import { buildStoreEmbed } from './storeUI.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'store',
  aliases: ['catalog', 'shop'],
  module: 'store',
  description: 'Shows all items in the guild store',
  usage: 'store [page]',
  examples: ['store', 'store 2'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const items = await getItems(ctx.guild.id);
    const config = await getEconomyConfig(ctx.guild.id);
    const currency = config?.currencySymbol || '$';
    
    const pageArg = parseInt(ctx.parsed.args[0]) || 1;
    const itemsPerPage = 10;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const page = Math.max(1, Math.min(pageArg, totalPages));

    const embed = buildStoreEmbed(items, currency, ctx.guild.name, page, totalPages);
    await ctx.respond.raw({ embeds: [embed] });
  },
});


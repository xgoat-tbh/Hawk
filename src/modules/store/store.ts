import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getItems } from './storeService.js';
import { buildStorePayload } from './storeUI.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import type { GuildTextBasedChannel } from 'discord.js';

export default defineCommand({
  name: 'store',
  aliases: ['catalog', 'shop'],
  module: 'store',
  description: 'Shows all items and roles available in the server store',
  usage: 'store [page]',
  examples: ['store', 'store 2'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const items = await getItems(ctx.guild.id);
    const config = await getEconomyConfig(ctx.guild.id);
    const currency = config?.currencySymbol || '$';
    
    const pageArg = parseInt(ctx.parsed.args[0], 10) || 1;
    const itemsPerPage = 10;
    const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
    const page = Math.max(1, Math.min(pageArg, totalPages));

    const payload = buildStorePayload(items, currency, ctx.guild.name, page, totalPages, ctx.message.author.id);
    await (ctx.channel as GuildTextBasedChannel).send({
      components: payload.components,
      flags: payload.flags as any,
    });
  },
});


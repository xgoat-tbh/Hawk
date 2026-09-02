import type { ModuleManifest } from '../../types/module.js';
import { getItems } from './storeService.js';
import { buildStorePayload } from './storeUI.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { MessageFlags } from 'discord.js';

export default {
  name: 'store',
  description: 'Guild Store and User Inventories',
  buttonPrefixes: ['store_page_'],
  onButton: async (interaction) => {
    if (!interaction.customId.startsWith('store_page_')) return;
    const parts = interaction.customId.split('_');
    const direction = parts[2]; // 'prev' or 'next'
    const invokerId = parts[3];
    const pageNum = parseInt(parts[4], 10);

    if (interaction.user.id !== invokerId) {
      await interaction.reply({ content: 'Only the command invoker can use these pagination controls.', flags: MessageFlags.Ephemeral });
      return;
    }

    const newPage = direction === 'prev' ? pageNum - 1 : pageNum + 1;
    const items = await getItems(interaction.guildId!);
    const config = await getEconomyConfig(interaction.guildId!);
    const currency = config?.currencySymbol || '$';
    const itemsPerPage = 10;
    const totalPages = Math.ceil(items.length / itemsPerPage) || 1;

    const payload = buildStorePayload(items, currency, interaction.guild!.name, newPage, totalPages, invokerId);
    await interaction.update({
      components: payload.components,
      flags: payload.flags as any,
    });
  },
} satisfies ModuleManifest;


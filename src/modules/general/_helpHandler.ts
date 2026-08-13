import type { StringSelectMenuInteraction, ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { getPrefix } from '../../core/database/repositories/guildConfigRepo.js';
import { buildCategoryHelpEmbed, getCategory } from './helpUI.js';

export async function handleHelpSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.customId.startsWith('help_category_select')) return;
  if (!interaction.guild || interaction.replied || interaction.deferred) return;

  const ownerId = interaction.customId.replace('help_category_select_', '');
  if (ownerId && interaction.user.id !== ownerId) {
    await interaction.reply({
      content: 'Only the user who invoked this help menu can use this dropdown.',
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return;
  }

  const selectedCategoryId = interaction.values[0]?.toLowerCase();
  if (!selectedCategoryId) return;

  const prefix = await getPrefix(interaction.guild.id);
  const matchedCat = getCategory(selectedCategoryId);

  if (!matchedCat) {
    await interaction.reply({ content: 'Invalid category selection.', flags: MessageFlags.Ephemeral }).catch(() => {});
    return;
  }

  const payload = buildCategoryHelpEmbed(matchedCat.id, prefix, ownerId || interaction.user.id, 1);
  await interaction.update(payload).catch(() => {});
}

export async function handleHelpButton(interaction: ButtonInteraction): Promise<void> {
  const { customId, guild, user } = interaction;
  if (!customId.startsWith('help_page_') || !guild || interaction.replied || interaction.deferred) return;

  // Format: help_page_{prev|next}_{categoryId}_{page}_{userId}
  const parts = customId.split('_');
  if (parts.length < 6) return;

  const dir = parts[2];
  const categoryId = parts[3];
  const page = parseInt(parts[4], 10) || 1;
  const ownerId = parts[5];

  if (ownerId && user.id !== ownerId) {
    await interaction.reply({
      content: 'Only the user who invoked this help menu can use these pagination buttons.',
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return;
  }

  const targetPage = dir === 'prev' ? Math.max(1, page - 1) : page + 1;
  const prefix = await getPrefix(guild.id);
  const payload = buildCategoryHelpEmbed(categoryId, prefix, ownerId || user.id, targetPage);

  await interaction.update(payload).catch(() => {});
}

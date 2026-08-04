import type { StringSelectMenuInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';
import { getPrefix } from '../../core/database/repositories/guildConfigRepo.js';
import { buildCategoryHelpEmbed } from './helpUI.js';
import { getModules, getModuleCommands } from '../../core/commands/CommandRegistry.js';

export async function handleHelpSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.customId.startsWith('help_category_select')) return;
  if (!interaction.guild || interaction.replied || interaction.deferred) return;

  const ownerId = interaction.customId.replace('help_category_select_', '');
  if (ownerId && interaction.user.id !== ownerId) {
    await interaction.reply({
      content: 'Only the user who invoked this help menu can use this dropdown.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const selectedModule = interaction.values[0]?.toLowerCase();
  if (!selectedModule) return;

  const prefix = await getPrefix(interaction.guild.id);
  const activeModules = getModules().filter(m => getModuleCommands(m).length > 0);
  const matchedMod = activeModules.find(m => m.toLowerCase() === selectedModule);

  if (!matchedMod) {
    await interaction.reply({ content: 'Invalid module selection.', flags: MessageFlags.Ephemeral });
    return;
  }

  const payload = buildCategoryHelpEmbed(matchedMod, prefix, ownerId || interaction.user.id);
  await interaction.update(payload);
}

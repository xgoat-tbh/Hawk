import type { ModuleManifest } from '../../types/module.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { getLeaderboard, addBank, LeaderboardSort } from './economyService.js';
import { buildLeaderboardEmbed } from './economyUI.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from 'discord.js';

const passiveCooldowns = new Map<string, number>();

async function handlePassiveChatIncome(message: Message) {
  if (!message.guild || message.author.bot) return;

  const config = await getEconomyConfig(message.guild.id);
  if (!config.passiveIncome) return;

  const key = `${message.guild.id}-${message.author.id}`;
  const now = Date.now();
  const last = passiveCooldowns.get(key) || 0;

  if (now - last < 60000) return; // 60s cooldown

  passiveCooldowns.set(key, now);
  await addBank(message.guild.id, message.author.id, config.passiveAmount || 10).catch(() => {});
}

export default {
  name: 'economy',
  description: 'Economy and currency system',
  buttonPrefixes: ['lb_page_'],
  onMessage: async (message) => {
    await handlePassiveChatIncome(message);
  },
  onButton: async (interaction) => {
    if (!interaction.customId.startsWith('lb_page_')) return;
    
    const [, , sortBy, pageStr, userId] = interaction.customId.split('_');
    if (interaction.user.id !== userId) {
      await interaction.reply({ content: 'This button is not for you.', ephemeral: true });
      return;
    }

    const page = parseInt(pageStr, 10);
    const config = await getEconomyConfig(interaction.guildId!);
    const pageSize = 10;
    const { entries, total } = await getLeaderboard(interaction.guildId!, sortBy as LeaderboardSort, page, pageSize);
    const totalPages = Math.ceil(total / pageSize) || 1;

    const embed = buildLeaderboardEmbed(entries, page, totalPages, sortBy, config.currencySymbol, interaction.guild!.name);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`lb_page_${sortBy}_${page - 1}_${userId}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page <= 1),
        new ButtonBuilder()
          .setCustomId(`lb_page_${sortBy}_${page + 1}_${userId}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages)
      );

    await interaction.update({ embeds: [embed], components: [row] });
  },
} satisfies ModuleManifest;

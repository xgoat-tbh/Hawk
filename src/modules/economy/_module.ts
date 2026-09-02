import type { ModuleManifest } from '../../types/module.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { getLeaderboard, addBank, LeaderboardSort } from './economyService.js';
import { buildLeaderboardPayload } from './economyUI.js';
import { Message, MessageFlags } from 'discord.js';

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
  buttonPrefixes: ['econ_lb_'],
  onMessage: async (message) => {
    await handlePassiveChatIncome(message);
  },
  onButton: async (interaction) => {
    if (!interaction.customId.startsWith('econ_lb_')) return;
    
    const parts = interaction.customId.split('_');
    const direction = parts[2]; // 'prev' or 'next'
    const userId = parts[3];
    const pageNum = parseInt(parts[4], 10);
    const sortBy = (parts[5] || 'net') as LeaderboardSort;

    if (interaction.user.id !== userId) {
      await interaction.reply({ content: 'Only the command invoker can use these pagination controls.', flags: MessageFlags.Ephemeral });
      return;
    }

    const newPage = direction === 'prev' ? pageNum - 1 : pageNum + 1;
    const config = await getEconomyConfig(interaction.guildId!);
    const pageSize = 10;
    const { entries, total } = await getLeaderboard(interaction.guildId!, sortBy, newPage, pageSize);
    const totalPages = Math.ceil(total / pageSize) || 1;

    const payload = buildLeaderboardPayload(entries, newPage, totalPages, sortBy, config.currencySymbol, interaction.guild!.name, userId);
    await interaction.update({
      components: payload.components,
      flags: payload.flags as any,
    });
  },
} satisfies ModuleManifest;

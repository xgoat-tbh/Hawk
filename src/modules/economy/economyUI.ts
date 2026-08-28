import { EmbedBuilder } from 'discord.js';
import type { GuildMember } from 'discord.js';
import { branding } from '../../core/config/branding.js';
import type { Balance, LeaderboardEntry } from './economyService.js';

export function buildBalanceEmbed(member: GuildMember, balance: Balance, currencySymbol: string): EmbedBuilder {
  const netWorth = balance.cash + balance.bank;
  return new EmbedBuilder()
    .setColor(branding.defaultColor)
    .setAuthor({ name: `${member.user.username}'s Balance`, iconURL: member.user.displayAvatarURL() })
    .addFields(
      { name: 'Cash', value: `${currencySymbol}${balance.cash.toLocaleString()}`, inline: true },
      { name: 'Bank', value: `${currencySymbol}${balance.bank.toLocaleString()} / ${balance.bankCapacity.toLocaleString()}`, inline: true },
      { name: 'Net Worth', value: `${currencySymbol}${netWorth.toLocaleString()}`, inline: true }
    );
}

export function buildLeaderboardEmbed(entries: LeaderboardEntry[], page: number, totalPages: number, sortBy: string, currencySymbol: string, guildName: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(branding.defaultColor)
    .setTitle(`${guildName} Economy Leaderboard (${sortBy})`);
  
  if (entries.length === 0) {
    embed.setDescription('No entries found.');
  } else {
    const description = entries.map((entry, index) => {
      const rank = (page - 1) * entries.length + index + 1;
      const value = sortBy === 'cash' ? entry.cash : sortBy === 'bank' ? entry.bank : entry.cash + entry.bank;
      return `**${rank}.** <@${entry.userId}> - ${currencySymbol}${value.toLocaleString()}`;
    }).join('\n');
    embed.setDescription(description);
  }

  embed.setFooter({ text: `Page ${page} of ${totalPages || 1}` });
  return embed;
}

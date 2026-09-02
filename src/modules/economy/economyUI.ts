import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type GuildMember,
} from 'discord.js';
import { ui, type ComponentV2Payload } from '../../core/ui/index.js';
import type { Balance, LeaderboardEntry } from './economyService.js';

export function buildBalancePayload(member: GuildMember, balance: Balance, currencySymbol: string): ComponentV2Payload {
  const netWorth = balance.cash + balance.bank;
  const bankDisplay = balance.bankCapacity > 0
    ? `${currencySymbol}${balance.bank.toLocaleString()} / ${balance.bankCapacity.toLocaleString()}`
    : `${currencySymbol}${balance.bank.toLocaleString()}`;

  const now = Date.now();
  let dailyStatus = 'Ready to claim! (`!daily`)';
  if (balance.dailyLast) {
    const elapsed = now - balance.dailyLast.getTime();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (elapsed < ONE_DAY_MS) {
      const nextTimestamp = Math.floor((balance.dailyLast.getTime() + ONE_DAY_MS) / 1000);
      dailyStatus = `<t:${nextTimestamp}:R>`;
    }
  }

  const content =
    `• **Wallet / Cash:** \`${currencySymbol}${balance.cash.toLocaleString()}\`\n` +
    `• **Bank Balance:** \`${bankDisplay}\`\n` +
    `• **Total Net Worth:** \`${currencySymbol}${netWorth.toLocaleString()}\`\n` +
    `• **Daily Streak:** 🔥 \`${balance.dailyStreak} day(s)\`\n` +
    `• **Daily Status:** ${dailyStatus}`;

  return ui.standard({
    title: `${member.user.username}'s Balance`,
    text: content,
    thumbnailUrl: member.user.displayAvatarURL({ size: 128 }),
  });
}

export function buildLeaderboardPayload(
  entries: LeaderboardEntry[],
  page: number,
  totalPages: number,
  sortBy: string,
  currencySymbol: string,
  guildName: string,
  invokerId: string,
): ComponentV2Payload {
  const sortLabel = sortBy.toUpperCase();

  let text = '';
  if (entries.length === 0) {
    text = '*No leaderboard entries found for this server.*';
  } else {
    text = entries.map((entry, index) => {
      const rank = (page - 1) * 10 + index + 1;
      const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
      const value = sortBy === 'cash' ? entry.cash : sortBy === 'bank' ? entry.bank : entry.cash + entry.bank;
      return `${rankBadge} <@${entry.userId}> · \`${currencySymbol}${value.toLocaleString()}\``;
    }).join('\n');
  }

  const prevBtn = new ButtonBuilder()
    .setCustomId(`econ_lb_prev_${invokerId}_${page}_${sortBy}`)
    .setLabel('◀ Previous')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page <= 1);

  const pageIndicator = new ButtonBuilder()
    .setCustomId(`econ_lb_page_${invokerId}`)
    .setLabel(`${page} / ${totalPages || 1}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextBtn = new ButtonBuilder()
    .setCustomId(`econ_lb_next_${invokerId}_${page}_${sortBy}`)
    .setLabel('Next ▶')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages);

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, pageIndicator, nextBtn);

  return ui.standard({
    title: `${guildName} Economy Leaderboard (${sortLabel})`,
    text,
    components: [actionRow],
  });
}

// Backwards compatibility aliases
export const buildBalanceEmbed = buildBalancePayload;
export const buildLeaderboardEmbed = buildLeaderboardPayload;



import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getLeaderboard } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { buildLeaderboardEmbed } from './economyUI.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default defineCommand({
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  module: 'economy',
  description: 'View the economy leaderboard',
  usage: 'leaderboard [cash|bank|net] [page]',
  examples: ['leaderboard', 'leaderboard bank 2'],
  permissions: [],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    let sortBy: 'cash' | 'bank' | 'net' = 'net';
    let page = 1;

    for (const arg of ctx.parsed.args) {
      if (['cash', 'bank', 'net'].includes(arg.toLowerCase())) {
        sortBy = arg.toLowerCase() as 'cash' | 'bank' | 'net';
      } else if (!isNaN(parseInt(arg, 10))) {
        page = parseInt(arg, 10);
      }
    }

    const config = await getEconomyConfig(ctx.guild.id);
    const pageSize = 10;
    const { entries, total } = await getLeaderboard(ctx.guild.id, sortBy, page, pageSize);
    const totalPages = Math.ceil(total / pageSize) || 1;

    if (page > totalPages || page < 1) {
      await ctx.respond.error(`Invalid page. Valid pages are 1-${totalPages}.`);
      return;
    }

    const embed = buildLeaderboardEmbed(entries, page, totalPages, sortBy, config.currencySymbol, ctx.guild.name);
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`lb_page_${sortBy}_${page - 1}_${ctx.message.author.id}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page <= 1),
        new ButtonBuilder()
          .setCustomId(`lb_page_${sortBy}_${page + 1}_${ctx.message.author.id}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages)
      );

    await ctx.respond.raw({ embeds: [embed], components: [row] });
  },
});

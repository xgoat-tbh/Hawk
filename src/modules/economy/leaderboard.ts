import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getLeaderboard, LeaderboardSort } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { buildLeaderboardPayload } from './economyUI.js';
import type { GuildTextBasedChannel } from 'discord.js';

export default defineCommand({
  name: 'leaderboard',
  aliases: ['lb', 'top', 'rich'],
  module: 'economy',
  description: 'View the server economy leaderboard',
  usage: 'leaderboard [cash|bank|net] [page]',
  examples: ['leaderboard', 'leaderboard bank 2'],
  permissions: [],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    let sortBy: LeaderboardSort = 'net';
    let page = 1;

    for (const arg of ctx.parsed.args) {
      const lower = arg.toLowerCase();
      if (['cash', 'bank', 'net'].includes(lower)) {
        sortBy = lower as LeaderboardSort;
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

    const payload = buildLeaderboardPayload(entries, page, totalPages, sortBy, config.currencySymbol, ctx.guild.name, ctx.message.author.id);
    await (ctx.channel as GuildTextBasedChannel).send({
      components: payload.components,
      flags: payload.flags as any,
    });
  },
});

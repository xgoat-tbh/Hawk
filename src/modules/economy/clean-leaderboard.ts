import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { cleanLeaderboard, logAuditAction } from './economyService.js';

export default defineCommand({
  name: 'clean-leaderboard',
  aliases: ['cleanlb'],
  module: 'economy',
  description: 'Remove members who left from the leaderboard',
  usage: 'clean-leaderboard',
  examples: ['clean-leaderboard'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 10,
  async execute(ctx: CommandContext): Promise<void> {
    const cleaned = await cleanLeaderboard(ctx.guild.id);
    await logAuditAction(ctx.guild.id, ctx.message.author.id, ctx.guild.id, 'clean', 0, 'Cleaned leaderboard');
    await ctx.respond.success(`Leaderboard cleaned (${cleaned} inactive entries removed).`);
  }
});

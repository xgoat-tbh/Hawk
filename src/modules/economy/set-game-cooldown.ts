import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { setEconomyConfigField } from '../../core/database/repositories/economyConfigRepo.js';
import { setGameCooldown } from '../../core/database/repositories/gameCooldownRepo.js';

export default defineCommand({
  name: 'set-game-cooldown',
  aliases: ['game-cooldown', 'setcooldown'],
  module: 'economy',
  description: 'Set the cooldown in seconds for minigames (coinflip, mines) or economy jobs (work, slut, crime, rob)',
  usage: 'set-game-cooldown <coinflip|mines|all|work|slut|crime|rob> <seconds>',
  examples: ['set-game-cooldown coinflip 15', 'set-game-cooldown mines 30', 'set-game-cooldown work 3600', 'set-game-cooldown all 20'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.parsed.args.length < 2) {
      await ctx.respond.error(`Usage: \`${ctx.parsed.prefix}set-game-cooldown <coinflip|mines|all|work|slut|crime|rob> <seconds>\``);
      return;
    }

    const game = ctx.parsed.args[0]?.toLowerCase();
    const rawSec = ctx.parsed.args[1]?.toLowerCase().replace('s', '');
    const seconds = parseInt(rawSec, 10);

    const economyJobs = ['work', 'slut', 'crime', 'rob'];
    const minigames = ['coinflip', 'cf', 'mines', 'all'];

    if (!game || (!economyJobs.includes(game) && !minigames.includes(game))) {
      await ctx.respond.error('Valid options: `coinflip`, `mines`, `all`, `work`, `slut`, `crime`, `rob`.');
      return;
    }

    if (isNaN(seconds) || seconds < 0 || seconds > 86400) {
      await ctx.respond.error('Please specify a valid cooldown in seconds (0 to 86400).');
      return;
    }

    if (economyJobs.includes(game)) {
      await setEconomyConfigField(ctx.guild.id, `${game}Cooldown` as any, seconds);
      await ctx.respond.success(`Cooldown for **${game}** set to **${seconds}s**.`);
    } else if (game === 'all') {
      await setGameCooldown(ctx.guild.id, 'coinflip', seconds);
      await setGameCooldown(ctx.guild.id, 'mines', seconds);
      await ctx.respond.success(`Cooldown for **all minigames** set to **${seconds}s**.`);
    } else {
      const canonicalGame = game === 'cf' ? 'coinflip' : game;
      await setGameCooldown(ctx.guild.id, canonicalGame, seconds);
      await ctx.respond.success(`Cooldown for **${canonicalGame}** set to **${seconds}s**.`);
    }
  },
});

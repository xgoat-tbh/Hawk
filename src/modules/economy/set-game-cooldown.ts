import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { setEconomyConfigField } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'set-game-cooldown',
  module: 'economy',
  description: 'Set the cooldown for games/jobs',
  usage: 'set-game-cooldown <work|slut|crime|rob> <seconds>',
  examples: ['set-game-cooldown work 3600'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const game = ctx.parsed.args[0]?.toLowerCase();
    const seconds = parseInt(ctx.parsed.args[1], 10);
    
    const valid = ['work', 'slut', 'crime', 'rob'];
    if (!valid.includes(game)) await ctx.respond.error('Valid games: ' + valid.join(', '));
    if (isNaN(seconds) || seconds < 0) await ctx.respond.error('Provide valid seconds.');

    await setEconomyConfigField(ctx.guild.id, `${game}Cooldown` as any, seconds);
    await ctx.respond.success(`Cooldown for **${game}** set to **${seconds}s**`);
  }
});

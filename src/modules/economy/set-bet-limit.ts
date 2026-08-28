import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { setEconomyConfigField } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'set-bet-limit',
  module: 'economy',
  description: 'Set minimum and maximum bet limits',
  usage: 'set-bet-limit <min> <max>',
  examples: ['set-bet-limit 10 10000'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const min = parseInt(ctx.parsed.args[0], 10);
    const max = parseInt(ctx.parsed.args[1], 10);
    
    if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
      await ctx.respond.error('Provide valid min and max amounts (min <= max).');
    }

    await setEconomyConfigField(ctx.guild.id, 'minBet', min);
    await setEconomyConfigField(ctx.guild.id, 'maxBet', max);
    await ctx.respond.success(`Bet limits set: Min **${min}** | Max **${max}**`);
  }
});

import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { setEconomyConfigField } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'set-income-reset',
  module: 'economy',
  description: 'Set passive income reset duration',
  usage: 'set-income-reset <seconds>',
  examples: ['set-income-reset 86400'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const duration = parseInt(ctx.parsed.args[0], 10);
    if (isNaN(duration) || duration < 0) {
      await ctx.respond.error('Provide a valid duration in seconds.');
      return;
    }

    await setEconomyConfigField(ctx.guild.id, 'passiveCooldown' as any, duration).catch(() => {});
    await ctx.respond.success(`Income reset duration set to **${duration}s**`);
  }
});

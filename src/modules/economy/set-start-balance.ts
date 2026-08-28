import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { setEconomyConfigField } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'set-start-balance',
  module: 'economy',
  description: 'Set the starting balance for new users',
  usage: 'set-start-balance <amount>',
  examples: ['set-start-balance 1000'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const amount = parseInt(ctx.parsed.args[0], 10);
    if (isNaN(amount) || amount < 0) {
      await ctx.respond.error('Provide a valid positive amount.');
      return;
    }

    await setEconomyConfigField(ctx.guild.id, 'startBalance', amount);
    await ctx.respond.success(`Starting balance set to **${amount}**`);
  }
});

import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { setEconomyConfigField } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'set-currency',
  aliases: ['setcur'],
  module: 'economy',
  description: 'Set the currency symbol',
  usage: 'set-currency <symbol>',
  examples: ['set-currency $', 'set-currency :coin:'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const symbol = ctx.parsed.args[0];
    if (!symbol) await ctx.respond.error('Please provide a currency symbol.');

    await setEconomyConfigField(ctx.guild.id, 'currencySymbol', symbol);
    await ctx.respond.success(`Currency symbol set to **${symbol}**`);
  }
});

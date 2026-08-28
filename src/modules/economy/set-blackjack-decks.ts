import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { setEconomyConfigField } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'set-blackjack-decks',
  module: 'economy',
  description: 'Set the number of decks used in blackjack',
  usage: 'set-blackjack-decks <count>',
  examples: ['set-blackjack-decks 4'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const count = parseInt(ctx.parsed.args[0], 10);
    if (isNaN(count) || count < 1 || count > 8) {
      await ctx.respond.error('Provide a valid deck count between 1 and 8.');
    }

    await setEconomyConfigField(ctx.guild.id, 'blackjackDecks', count);
    await ctx.respond.success(`Blackjack decks set to **${count}**`);
  }
});

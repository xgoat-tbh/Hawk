import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { casinoService } from './casinoService.js';
import { createGame } from './blackjackEngine.js';
import { buildBlackjackEmbed, buildBlackjackButtons } from './casinoUI.js';
import { getEmoji } from '../../core/config/branding.js';

// In-memory store for active games, exported so module can access it
export const activeBlackjackGames = new Map<string, any>();

// Cleanup old games every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, game] of activeBlackjackGames.entries()) {
    if (now - game.timestamp > 5 * 60 * 1000) {
      activeBlackjackGames.delete(key);
    }
  }
}, 5 * 60 * 1000);

export default defineCommand({
  name: 'blackjack',
  aliases: ['bj'],
  module: 'casino',
  description: 'Play a game of Blackjack',
  usage: 'blackjack <bet>',
  examples: ['blackjack 100'],
  permissions: [],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    const betStr = ctx.parsed.args[0];
    if (!betStr) {
      await ctx.respond.warning('Please specify a bet amount.');
      return;
    }
    
    const bet = parseInt(betStr, 10);
    if (isNaN(bet) || bet <= 0) {
      await ctx.respond.error('Invalid bet amount.');
      return;
    }
    
    const guildId = ctx.message.guildId!;
    const userId = ctx.message.author.id;
    
    const valid = await casinoService.validateBet(guildId, bet);
    if (!valid) {
      await ctx.respond.error('Bet amount is invalid or out of limits.');
      return;
    }
    
    const success = await casinoService.placeBet(guildId, userId, bet);
    if (!success) {
      await ctx.respond.error('You do not have enough cash to place this bet.');
      return;
    }
    
    const game = createGame(bet, 4);
    const gameKey = `${guildId}:${userId}`;
    
    activeBlackjackGames.set(gameKey, {
      ...game,
      timestamp: Date.now()
    });
    
    const currencySymbol = getEmoji('currency') || '$';
    const embed = buildBlackjackEmbed(game, ctx.message.author.username, bet, currencySymbol);
    const components = buildBlackjackButtons(game, guildId, userId);
    
    // If the game ended immediately (e.g. Blackjack)
    if (game.status !== 'playing') {
      const { payout } = (await import('./blackjackEngine.js')).resolveGame(game);
      if (payout > 0) {
        await casinoService.awardWinnings(guildId, userId, payout);
      }
      activeBlackjackGames.delete(gameKey);
      await ctx.message.reply({ embeds: [embed] });
      return;
    }
    
    await ctx.message.reply({
      embeds: [embed],
      components: components.components.length > 0 ? [components] : []
    });
  },
});

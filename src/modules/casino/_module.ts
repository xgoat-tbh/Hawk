import type { ModuleManifest } from '../../types/module.js';
import { activeBlackjackGames } from './blackjack.js';
import { hit, stand, doubleDown, split, resolveGame } from './blackjackEngine.js';
import { buildBlackjackEmbed, buildBlackjackButtons } from './casinoUI.js';
import { casinoService } from './casinoService.js';
import { getEmoji } from '../../core/config/branding.js';

export default {
  name: 'casino',
  description: 'Various casino games and betting systems',
  buttonPrefixes: ['bj_'],
  onButton: async (interaction) => {
    if (!interaction.isButton()) return;
    const customId = interaction.customId;
    
    if (!customId.startsWith('bj_')) return;
    
    const parts = customId.split('_');
    if (parts.length < 4) return;
    
    const action = parts[1]; // hit, stand, double, split
    const guildId = parts[2];
    const userId = parts[3];
    
    // Ensure only the player who started the game can interact
    if (interaction.user.id !== userId) {
      await interaction.reply({ content: 'This is not your game!', ephemeral: true });
      return;
    }
    
    const gameKey = `${guildId}:${userId}`;
    const game = activeBlackjackGames.get(gameKey);
    
    if (!game) {
      await interaction.update({ content: 'Game has expired or does not exist.', embeds: [], components: [] });
      return;
    }
    
    let updatedGame = game;
    
    if (action === 'hit') {
      updatedGame = hit(game);
    } else if (action === 'stand') {
      updatedGame = stand(game);
    } else if (action === 'double') {
      const success = await casinoService.placeBet(guildId, userId, game.bet);
      if (!success) {
        await interaction.reply({ content: 'You do not have enough cash to double down.', ephemeral: true });
        return;
      }
      updatedGame = doubleDown(game);
    } else if (action === 'split') {
      const success = await casinoService.placeBet(guildId, userId, game.bet);
      if (!success) {
        await interaction.reply({ content: 'You do not have enough cash to split.', ephemeral: true });
        return;
      }
      updatedGame = split(game);
    }
    
    updatedGame.timestamp = Date.now();
    activeBlackjackGames.set(gameKey, updatedGame);
    
    const currencySymbol = getEmoji('currency') || '$';
    const embed = buildBlackjackEmbed(updatedGame, interaction.user.username, updatedGame.bet, currencySymbol);
    const components = buildBlackjackButtons(updatedGame, guildId, userId);
    
    if (updatedGame.status !== 'playing') {
      const { payout } = resolveGame(updatedGame);
      if (payout > 0) {
        await casinoService.awardWinnings(guildId, userId, payout);
      }
      activeBlackjackGames.delete(gameKey);
      await interaction.update({ embeds: [embed], components: [] });
    } else {
      await interaction.update({ embeds: [embed], components: components.components.length > 0 ? [components as any] : [] });
    }
  }
} satisfies ModuleManifest;

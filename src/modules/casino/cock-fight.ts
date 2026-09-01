import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { casinoService } from './casinoService.js';
import { generateRooster, simulateFight } from './cockfightEngine.js';
import { buildCockfightEmbed } from './casinoUI.js';
import { parseAmount } from '../economy/economyUtils.js';

export default defineCommand({
  name: 'cock-fight',
  aliases: ['cf', 'cockfight'],
  module: 'casino',
  description: 'Bet on a stochastic combat between two roosters',
  usage: 'cock-fight <bet>',
  examples: ['cockfight 100', 'cockfight 1e6', 'cockfight 50k'],
  permissions: [],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    const betStr = ctx.parsed.args[0];
    if (!betStr) {
      await ctx.respond.warning('Please specify a bet amount.');
      return;
    }
    
    const bet = parseAmount(betStr);
    if (!bet || bet <= 0) {
      await ctx.respond.error('Invalid bet amount (e.g. `100`, `1e6`, `50k`).');
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
    
    const yourRooster = generateRooster('El Diablo');
    const opponentRooster = generateRooster('Thunderbeak');
    
    const fight = simulateFight(yourRooster, opponentRooster);
    const won = fight.winner === 1;
    
    // Usually a 1v1 fight is 1:1 payout, so return original bet * 2
    const payout = won ? bet * 2 : 0;
    
    if (won && payout > 0) {
      await casinoService.awardWinnings(guildId, userId, payout);
    }
    
    const currencySymbol = '$';
    const embed = buildCockfightEmbed(fight, bet, won, payout, currencySymbol);
    
    await ctx.message.reply({ embeds: [embed] });
  },
});

import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { casinoService } from './casinoService.js';
import { spin, parseBet, evaluateBet } from './rouletteEngine.js';
import { buildRouletteEmbed } from './casinoUI.js';
import { parseAmount } from '../economy/economyUtils.js';

export default defineCommand({
  name: 'roulette',
  aliases: ['rl', 'rlt'],
  module: 'casino',
  description: 'Play a game of European single-zero roulette',
  usage: 'roulette <bet> <bet_type>',
  examples: ['roulette 100 red', 'roulette 1e6 red', 'roulette 50k 17'],
  permissions: [],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    const betStr = ctx.parsed.args[0];
    const betTypeStr = ctx.parsed.args.slice(1).join(' ');
    
    if (!betStr || !betTypeStr) {
      await ctx.respond.warning(`Usage: \`${ctx.parsed.prefix}roulette <bet> <bet_type>\``);
      return;
    }
    
    const bet = parseAmount(betStr);
    if (!bet || bet <= 0) {
      await ctx.respond.error('Invalid bet amount (e.g. `100`, `1e6`, `50k`).');
      return;
    }
    
    const parsedBet = parseBet(betTypeStr);
    if (!parsedBet) {
      await ctx.respond.error('Invalid bet type. Use `!roulette-info` for a list of valid bet types.');
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
    
    const result = spin();
    const { won, multiplier } = evaluateBet(parsedBet, result);
    
    const payout = won ? bet * multiplier : 0;
    
    if (won && payout > 0) {
      // Winnings include original bet (e.g. 1:1 payout returns 2x original bet technically, 
      // but multiplier might be based on straight return. Let's adapt if needed.
      // E.g. straight 35:1 means payout = bet * 36.
      await casinoService.awardWinnings(guildId, userId, payout);
    }
    
    const currencySymbol = '$';
    const embed = buildRouletteEmbed(result, parsedBet, won, payout, currencySymbol);
    
    await ctx.message.reply({ embeds: [embed] });
  },
});

import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { casinoService } from './casinoService.js';
import { spinReels, evaluatePaylines, formatGrid } from './slotsEngine.js';
import { buildSlotsEmbed } from './casinoUI.js';
import { parseAmount } from '../economy/economyUtils.js';

export default defineCommand({
  name: 'slot-machine',
  aliases: ['slots', 'slot'],
  module: 'casino',
  description: 'Play the slot machine',
  usage: 'slots <bet>',
  examples: ['slots 100', 'slots 1e6', 'slots 50k'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
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
    
    const grid = spinReels();
    const { won, multiplier } = evaluatePaylines(grid);
    
    const payout = won ? Math.floor(bet * multiplier) : 0;
    
    if (won && payout > 0) {
      await casinoService.awardWinnings(guildId, userId, payout);
    }
    
    const gridStr = formatGrid(grid);
    const currencySymbol = '$';
    const embed = buildSlotsEmbed(gridStr, won, payout, bet, currencySymbol);
    
    await ctx.message.reply({ embeds: [embed] });
  },
});

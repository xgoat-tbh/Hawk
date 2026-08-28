import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { casinoService } from './casinoService.js';
import { createChamber, pullTrigger, calculatePayout } from './russianRouletteEngine.js';
import { buildRussianRouletteEmbed } from './casinoUI.js';

export default defineCommand({
  name: 'russian-roulette',
  aliases: ['rr'],
  module: 'casino',
  description: 'Play a dangerous game of Russian Roulette',
  usage: 'russian-roulette <bet> [bullets]',
  examples: ['rr 100', 'rr 50 2'],
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
    
    const bulletsStr = ctx.parsed.args[1];
    let bullets = 1;
    if (bulletsStr) {
      bullets = parseInt(bulletsStr, 10);
      if (isNaN(bullets) || bullets < 1 || bullets > 5) {
        ctx.respond.error('Invalid bullet count. Must be between 1 and 5.');
        return;
      }
    }
    
    const totalChambers = 6;
    
    const guildId = ctx.message.guildId!;
    const userId = ctx.message.author.id;
    
    const valid = await casinoService.validateBet(guildId, bet);
    if (!valid) {
      ctx.respond.error('Bet amount is invalid or out of limits.');
      return;
    }
    
    const success = await casinoService.placeBet(guildId, userId, bet);
    if (!success) {
      ctx.respond.error('You do not have enough cash to place this bet.');
      return;
    }
    
    const chambers = createChamber(bullets, totalChambers);
    const { fired } = pullTrigger(chambers, 0); // Always pull first chamber for simplicity
    
    const survived = !fired;
    const payout = survived ? calculatePayout(bullets, totalChambers, bet) : 0;
    
    if (survived && payout > 0) {
      await casinoService.awardWinnings(guildId, userId, payout);
    }
    
    const currencySymbol = '$';
    const embed = buildRussianRouletteEmbed(survived, payout, bet, currencySymbol);
    
    await ctx.message.reply({ embeds: [embed] });
  },
});

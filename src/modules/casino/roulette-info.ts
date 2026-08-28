import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { EmbedBuilder } from 'discord.js';

export default defineCommand({
  name: 'roulette-info',
  module: 'casino',
  description: 'Shows all bet types and their payouts in roulette',
  usage: 'roulette-info',
  examples: ['roulette-info'],
  permissions: [],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('Roulette Bet Types & Payouts')
      .setColor('#0099ff')
      .setDescription('Here are the valid bet types you can use in `!roulette` and their payouts.')
      .addFields(
        { name: 'Straight (Single Number)', value: 'Payout: 35:1\nUsage: `!roulette 100 <0-36>`\nExample: `!roulette 100 17`', inline: false },
        { name: 'Red / Black', value: 'Payout: 1:1\nUsage: `!roulette 100 red` or `!roulette 100 black`', inline: false },
        { name: 'Even / Odd', value: 'Payout: 1:1\nUsage: `!roulette 100 even` or `!roulette 100 odd`', inline: false },
        { name: 'Low (1-18) / High (19-36)', value: 'Payout: 1:1\nUsage: `!roulette 100 low` or `!roulette 100 high`', inline: false },
        { name: 'Dozen (1st 12, 2nd 12, 3rd 12)', value: 'Payout: 2:1\nUsage: `!roulette 100 d1` (or d2, d3)', inline: false },
        { name: 'Column (1st, 2nd, 3rd)', value: 'Payout: 2:1\nUsage: `!roulette 100 c1` (or c2, c3)', inline: false }
      )
      .setFooter({ text: 'Note: A bet on Green (0) can only be placed as a Straight bet.' });
      
    await ctx.message.reply({ embeds: [embed] });
  },
});

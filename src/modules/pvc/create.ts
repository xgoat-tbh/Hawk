import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { buyPvcTime } from './pvcService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'create',
  aliases: ['pvc-buy'],
  module: 'pvc',
  description: 'Buy or extend PVC time',
  usage: 'create <hours>',
  examples: ['create 2'],
  permissions: [],
  botPermissions: [],
  cooldown: 10,
  async execute(ctx: CommandContext): Promise<void> {
    const hoursStr = ctx.parsed.args[0];
    const hours = parseInt(hoursStr, 10);
    if (isNaN(hours) || hours <= 0) {
      await ctx.respond.error('Please provide a valid number of hours.');
      return;
    }

    const config = await getEconomyConfig(ctx.guild.id);

    try {
      const result = await buyPvcTime(ctx.guild.id, ctx.message.author.id, hours, config.pvcHourlyRate);
      if (result.extended) {
        await ctx.respond.success(`Extended your PVC time by ${hours} hours.`);
      } else {
        await ctx.respond.success(`Purchased ${hours} hours of PVC time. Join the JTC channel to activate it.`);
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Insufficient funds')) {
        await ctx.respond.error(`Insufficient funds. You need ${hours * config.pvcHourlyRate} to buy ${hours} hours.`);
      } else {
        await ctx.respond.error('Failed to buy PVC time. Please try again.');
      }
    }
  },
});

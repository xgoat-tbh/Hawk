import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { executeCrime } from './incomeService.js';

export default defineCommand({
  name: 'crime',
  aliases: [],
  module: 'income',
  description: 'Commit a crime for a chance at a big payout',
  usage: 'crime',
  examples: ['crime'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const result = await executeCrime(ctx.guild!.id, ctx.message.author.id);
    
    if (result.cooldown) {
      await ctx.respond.error(`You are on cooldown! Please wait **${result.cooldown}s** before committing another crime.`);
      return;
    }

    if (result.success) {
      await ctx.respond.success(result.message);
    } else {
      await ctx.respond.error(result.message);
    }
  },
});

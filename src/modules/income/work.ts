import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { executeWork } from './incomeService.js';

export default defineCommand({
  name: 'work',
  aliases: [],
  module: 'income',
  description: 'Work to earn some cash',
  usage: 'work',
  examples: ['work'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const result = await executeWork(ctx.guild!.id, ctx.message.author.id);
    
    if (result.cooldown) {
      await ctx.respond.error(`You are on cooldown! Please wait **${result.cooldown}s** before working again.`);
      return;
    }

    if (result.success) {
      await ctx.respond.success(result.message);
    } else {
      await ctx.respond.error(result.message);
    }
  },
});

import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { executeRob } from './incomeService.js';

export default defineCommand({
  name: 'rob',
  aliases: [],
  module: 'income',
  description: 'Attempt to rob another user',
  usage: 'rob <@user>',
  examples: ['rob @user'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.parsed.args.length < 1) {
      await ctx.respond.error('Please mention a user to rob.');
      return;
    }

    const victimMatch = ctx.parsed.args[0].match(/<@!?(\d+)>/);
    if (!victimMatch) {
      await ctx.respond.error('Invalid user mention. Usage: `rob <@user>`');
      return;
    }

    const victimId = victimMatch[1];
    
    const result = await executeRob(ctx.guild!.id, ctx.message.author.id, victimId);
    
    if (result.error) {
      await ctx.respond.error(result.error);
      return;
    }

    if (result.cooldown) {
      await ctx.respond.error(`You are on cooldown! Please wait **${result.cooldown}s** before trying to rob again.`);
      return;
    }

    if (result.success) {
      await ctx.respond.success(result.message);
    } else {
      await ctx.respond.error(result.message);
    }
  },
});

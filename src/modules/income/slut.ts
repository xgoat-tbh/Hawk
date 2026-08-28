import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { executeSlut } from './incomeService.js';

export default defineCommand({
  name: 'slut',
  aliases: [],
  module: 'income',
  description: 'Do some questionable things for cash',
  usage: 'slut',
  examples: ['slut'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const result = await executeSlut(ctx.guild!.id, ctx.message.author.id);
    
    if (result.cooldown) {
      await ctx.respond.error(`You are on cooldown! Please wait **${result.cooldown}s** before trying again.`);
      return;
    }

    if (result.success) {
      await ctx.respond.success(result.message);
    } else {
      await ctx.respond.error(result.message);
    }
  },
});

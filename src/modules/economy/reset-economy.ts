import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resetEconomy, logAuditAction } from './economyService.js';

export default defineCommand({
  name: 'reset-economy',
  aliases: ['reseteco'],
  module: 'economy',
  description: 'Reset the entire server economy',
  usage: 'reset-economy <Server Name>',
  examples: ['reset-economy MyServer'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 10,
  async execute(ctx: CommandContext): Promise<void> {
    const name = ctx.parsed.args.join(' ');
    if (name !== ctx.guild.name) {
      await ctx.respond.error(`Please confirm by typing the exact server name: \`${ctx.guild.name}\``);
    }

    await resetEconomy(ctx.guild.id);
    await logAuditAction(ctx.guild.id, ctx.message.author.id, ctx.guild.id, 'reset', 0, 'Complete economy reset');
    await ctx.respond.success('The server economy has been completely reset.');
  }
});

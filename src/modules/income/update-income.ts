import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { forceUpdateIncome } from './incomeService.js';

export default defineCommand({
  name: 'update-income',
  aliases: ['forcepay'],
  module: 'income',
  description: 'Force a mass payout for all members with a specific role',
  usage: 'update-income <@role>',
  examples: ['update-income @VIP'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 10, // Longer cooldown for mass actions
  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.parsed.args.length < 1) {
      await ctx.respond.error('Invalid arguments. Usage: `update-income <@role>`');
      return;
    }

    const roleMatch = ctx.parsed.args[0].match(/<@&(\d+)>/);
    if (!roleMatch) {
      await ctx.respond.error('Invalid role mention. Usage: `update-income <@role>`');
      return;
    }

    const roleId = roleMatch[1];
    
    if (!ctx.guild) {
        return;
    }

    await ctx.guild.members.fetch();
    const role = ctx.guild.roles.cache.get(roleId);
    
    if (!role) {
      await ctx.respond.error('Could not find that role in this server.');
      return;
    }

    const memberIds = Array.from(role.members.keys());
    
    if (memberIds.length === 0) {
      await ctx.respond.error('No members found with that role.');
      return;
    }

    const result = await forceUpdateIncome(ctx.guild.id, roleId, memberIds);
    
    if (result.amount === 0) {
      await ctx.respond.error(`Role <@&${roleId}> is not configured as an income role or has 0 payout.`);
      return;
    }

    await ctx.respond.success(`Successfully paid out **$${result.amount}** to ${result.membersPaid} members with the <@&${roleId}> role.`);
  },
});

import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { collectIncome } from './incomeService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import type { GuildMember } from 'discord.js';

export default defineCommand({
  name: 'collect',
  aliases: ['salary', 'claimincome', 'collectincome'],
  module: 'income',
  description: 'Collect your role-based passive income',
  usage: 'collect',
  examples: ['collect', 'salary'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    let member = ctx.member as GuildMember;
    
    if (!member && ctx.guild) {
      member = await ctx.guild.members.fetch(ctx.message.author.id);
    }
    
    if (!member) {
      await ctx.respond.error('Could not fetch your member details.');
      return;
    }

    const config = await getEconomyConfig(ctx.guild!.id);
    const roleIds = Array.from(member.roles.cache.keys());
    const result = await collectIncome(ctx.guild!.id, ctx.message.author.id, roleIds);
    
    if (result.cooldown) {
      const hours = Math.floor(result.cooldown / 3600);
      const minutes = Math.floor((result.cooldown % 3600) / 60);
      await ctx.respond.warning(`You have already collected your role income.\nPlease wait **${hours}h ${minutes}m**.`);
      return;
    }

    if (!result.success) {
      await ctx.respond.error(result.message || 'No income to collect from your roles.');
      return;
    }

    await ctx.respond.success(`Collected your role income of **${config.currencySymbol}${result.amount?.toLocaleString()}**.`);
  },
});

import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { collectIncome } from './incomeService.js';
import { GuildMember } from 'discord.js';

export default defineCommand({
  name: 'collect',
  aliases: ['daily', 'salary'],
  module: 'income',
  description: 'Collect your role-based income',
  usage: 'collect',
  examples: ['collect'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    let member = ctx.member as GuildMember;
    
    // In case member is not fully resolved, though usually it is in text commands
    if (!member && ctx.guild) {
        member = await ctx.guild.members.fetch(ctx.message.author.id);
    }
    
    if (!member) {
      await ctx.respond.error('Could not fetch your roles.');
      return;
    }

    const roleIds = Array.from(member.roles.cache.keys());
    const result = await collectIncome(ctx.guild!.id, ctx.message.author.id, roleIds);
    
    if (result.cooldown) {
      const hours = Math.floor(result.cooldown / 3600);
      const minutes = Math.floor((result.cooldown % 3600) / 60);
      await ctx.respond.error(`You have already collected your income! Please wait **${hours}h ${minutes}m**.`);
      return;
    }

    if (!result.success) {
      await ctx.respond.error(result.message || 'Failed to collect income.');
      return;
    }

    await ctx.respond.success(`You have successfully collected your income of **$${result.amount}**!`);
  },
});

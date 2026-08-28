import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { listIncomeRoles } from './incomeService.js';

export default defineCommand({
  name: 'list-roles',
  aliases: ['incroles'],
  module: 'income',
  description: 'List all roles that provide income',
  usage: 'list-roles',
  examples: ['list-roles'],
  permissions: [],
  botPermissions: [],
  cooldown: 3,
  async execute(ctx: CommandContext): Promise<void> {
    const roles = await listIncomeRoles(ctx.guild!.id);
    
    if (roles.length === 0) {
      await ctx.respond.info('There are currently no income roles configured for this server.');
      return;
    }

    let description = 'The following roles provide passive income when you use `!collect`:\n\n';
    for (const r of roles) {
      description += `• <@&${r.roleId}>: **$${r.incomeAmount}**\n`;
    }

    await ctx.respond.info(description);
  },
});

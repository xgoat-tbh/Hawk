import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { removeCash, removeBank, logAuditAction } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

export default defineCommand({
  name: 'remove-money-role',
  aliases: ['removebalrole'],
  module: 'economy',
  description: 'Remove money from all users with a role',
  usage: 'remove-money-role <@role> <amount> [cash|bank]',
  examples: ['remove-money-role @Role 1000'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    const roleId = ctx.parsed.tokens.find(t => t.type === 'mention_role')?.value;
    if (!roleId) {
      await ctx.respond.error('Please mention a role.');
      return;
    }
    
    const role = await ctx.guild.roles.fetch(roleId);
    if (!role) {
      await ctx.respond.error('Role not found.');
      return;
    }

    const args = ctx.parsed.args.filter(a => !a.includes('<@&'));
    const amount = parseInt(args[0], 10);
    const dest = args[1]?.toLowerCase() === 'bank' ? 'bank' : 'cash';

    if (isNaN(amount) || amount <= 0) {
      await ctx.respond.error('Provide a positive amount.');
      return;
    }

    let count = 0;
    for (const [memberId] of role.members) {
      if (dest === 'bank') await removeBank(ctx.guild.id, memberId, amount);
      else await removeCash(ctx.guild.id, memberId, amount);
      count++;
    }

    await logAuditAction(ctx.guild.id, ctx.message.author.id, roleId, 'remove', amount, `Removed from role ${role.name} (${dest})`);
    const config = await getEconomyConfig(ctx.guild.id);
    await ctx.respond.success(`Successfully removed **${config.currencySymbol}${amount.toLocaleString()}** from ${count} members in ${role.name}.`);
  }
});

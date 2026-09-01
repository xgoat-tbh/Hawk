import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { addMoneyToRole, logAuditAction } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { parseAmount } from './economyUtils.js';

export default defineCommand({
  name: 'remove-money-role',
  aliases: ['removebalrole'],
  module: 'economy',
  description: 'Remove money from all users with a role',
  usage: 'remove-money-role <@role> <amount> [cash|bank]',
  examples: ['remove-money-role @Role 1000', 'remove-money-role @Role 1e6 bank'],
  permissions: ['ManageGuild'],
  botPermissions: [],
  cooldown: 5,
  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.parsed.args.length < 2) {
      await ctx.respond.error('Usage: `remove-money-role <@role> <amount> [cash|bank]`');
      return;
    }

    const resolved = await resolveRole(ctx.parsed.args[0], ctx.guild);
    if (!resolved.success) {
      await ctx.respond.error(resolved.error);
      return;
    }

    const role = resolved.value;
    const amount = parseAmount(ctx.parsed.args[1]);
    const dest = ctx.parsed.args[2]?.toLowerCase() === 'bank' ? 'bank' : 'cash';

    if (!amount || amount <= 0) {
      await ctx.respond.error('Please provide a valid positive amount (e.g. `1000`, `1e6`, `50k`).');
      return;
    }

    // Fetch members with role
    const members = await ctx.guild.members.fetch();
    const roleMembers = members.filter(m => m.roles.cache.has(role.id));
    const memberIds = Array.from(roleMembers.keys());

    const updated = await addMoneyToRole(ctx.guild.id, memberIds, -amount, dest);

    await logAuditAction(ctx.guild.id, ctx.message.author.id, role.id, 'remove', amount, `Removed from role ${role.name} (${dest})`);
    const config = await getEconomyConfig(ctx.guild.id);
    await ctx.respond.success(`Successfully removed **${config.currencySymbol}${amount.toLocaleString()}** from **${updated}** members in ${role.name}.`);
  },
});

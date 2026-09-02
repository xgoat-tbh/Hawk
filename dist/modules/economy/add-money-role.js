import { defineCommand } from '../../types/command.js';
import { addMoneyToRole, logAuditAction } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { parseAmount } from './economyUtils.js';
export default defineCommand({
    name: 'add-money-role',
    aliases: ['addbalrole'],
    module: 'economy',
    description: 'Add money to all users with a role',
    usage: 'add-money-role <@role> <amount> [cash|bank]',
    examples: ['add-money-role @Role 1000', 'add-money-role @Role 1e6 bank'],
    permissions: ['ManageGuild'],
    botPermissions: [],
    cooldown: 5,
    async execute(ctx) {
        if (ctx.parsed.args.length < 2) {
            await ctx.respond.error('Usage: `add-money-role <@role> <amount> [cash|bank]`');
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
        const updated = await addMoneyToRole(ctx.guild.id, memberIds, amount, dest);
        await logAuditAction(ctx.guild.id, ctx.message.author.id, role.id, 'add', amount, `Added to role ${role.name} (${dest})`);
        const config = await getEconomyConfig(ctx.guild.id);
        await ctx.respond.success(`Successfully added **${config.currencySymbol}${amount.toLocaleString()}** to **${updated}** members in ${role.name}.`);
    },
});
//# sourceMappingURL=add-money-role.js.map
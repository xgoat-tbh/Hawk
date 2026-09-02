import { defineCommand } from '../../types/command.js';
import { removeIncomeRole } from './incomeService.js';
export default defineCommand({
    name: 'remove-income-role',
    aliases: ['remincrole'],
    module: 'income',
    description: 'Remove an income-providing role',
    usage: 'remove-income-role <@role>',
    examples: ['remove-income-role @VIP'],
    permissions: ['ManageGuild'],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        if (ctx.parsed.args.length < 1) {
            await ctx.respond.error('Invalid arguments. Usage: `remove-income-role <@role>`');
            return;
        }
        const roleMatch = ctx.parsed.args[0].match(/<@&(\d+)>/);
        if (!roleMatch) {
            await ctx.respond.error('Invalid role mention. Usage: `remove-income-role <@role>`');
            return;
        }
        const roleId = roleMatch[1];
        await removeIncomeRole(ctx.guild.id, roleId);
        await ctx.respond.success(`Successfully removed income configuration for role <@&${roleId}>.`);
    },
});
//# sourceMappingURL=remove-income-role.js.map
import { defineCommand } from '../../types/command.js';
import { updateIncomeRole } from './incomeService.js';
export default defineCommand({
    name: 'update-income-role',
    aliases: ['updateincrole'],
    module: 'income',
    description: 'Update an existing income-providing role',
    usage: 'update-income-role <@role> <amount>',
    examples: ['update-income-role @VIP 10000'],
    permissions: ['ManageGuild'],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        if (ctx.parsed.args.length < 2) {
            await ctx.respond.error('Invalid arguments. Usage: `update-income-role <@role> <amount>`');
            return;
        }
        const roleMatch = ctx.parsed.args[0].match(/<@&(\d+)>/);
        if (!roleMatch) {
            await ctx.respond.error('Invalid role mention. Usage: `update-income-role <@role> <amount>`');
            return;
        }
        const roleId = roleMatch[1];
        const amount = parseInt(ctx.parsed.args[1], 10);
        if (isNaN(amount) || amount <= 0) {
            await ctx.respond.error('Amount must be a positive number.');
            return;
        }
        await updateIncomeRole(ctx.guild.id, roleId, amount);
        await ctx.respond.success(`Successfully updated income for role <@&${roleId}> to **${amount}**.`);
    },
});
//# sourceMappingURL=update-income-role.js.map
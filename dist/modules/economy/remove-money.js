import { defineCommand } from '../../types/command.js';
import { removeCash, removeBank, logAuditAction } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { parseAmount } from './economyUtils.js';
export default defineCommand({
    name: 'remove-money',
    aliases: ['removebal'],
    module: 'economy',
    description: 'Remove money from a user',
    usage: 'remove-money <@user> <amount> [cash|bank]',
    examples: ['remove-money @User 1000', 'remove-money @User 1e9', 'remove-money @User 500k bank'],
    permissions: ['ManageGuild'],
    botPermissions: [],
    cooldown: 0,
    async execute(ctx) {
        if (ctx.parsed.args.length < 2) {
            await ctx.respond.error('Usage: `remove-money <@user> <amount> [cash|bank]`');
            return;
        }
        let targetId = null;
        let amountStr = '';
        let destArg = '';
        // Check if first argument is amount and second is user
        const parsedAmount0 = parseAmount(ctx.parsed.args[0]);
        if (parsedAmount0 !== null && ctx.parsed.args.length >= 2) {
            const resolved = await resolveUser(ctx.parsed.args[1], ctx.guild);
            if (resolved.success) {
                targetId = resolved.value.id;
                amountStr = ctx.parsed.args[0];
                destArg = ctx.parsed.args[2] || '';
            }
        }
        if (!targetId) {
            const resolved = await resolveUser(ctx.parsed.args[0], ctx.guild);
            if (!resolved.success) {
                await ctx.respond.error(resolved.error);
                return;
            }
            targetId = resolved.value.id;
            amountStr = ctx.parsed.args[1];
            destArg = ctx.parsed.args[2] || '';
        }
        const amount = parseAmount(amountStr);
        if (!amount || amount <= 0) {
            await ctx.respond.error('Please provide a valid positive amount (e.g. `1000`, `1e9`, `500k`, `2.5m`).');
            return;
        }
        const dest = destArg.toLowerCase() === 'bank' ? 'bank' : 'cash';
        const config = await getEconomyConfig(ctx.guild.id);
        if (dest === 'bank') {
            await removeBank(ctx.guild.id, targetId, amount);
        }
        else {
            await removeCash(ctx.guild.id, targetId, amount);
        }
        await logAuditAction(ctx.guild.id, ctx.message.author.id, targetId, 'remove', amount, `Removed from ${dest}`);
        await ctx.respond.success(`Successfully removed **${config.currencySymbol}${amount.toLocaleString()}** from <@${targetId}>'s ${dest}.`);
    },
});
//# sourceMappingURL=remove-money.js.map
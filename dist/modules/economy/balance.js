import { defineCommand } from '../../types/command.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { ensureBalance, getBalance } from './economyService.js';
import { buildBalancePayload } from './economyUI.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
export default defineCommand({
    name: 'balance',
    aliases: ['bal', 'money'],
    module: 'economy',
    description: 'Shows your balance or a specified user\'s balance',
    usage: 'balance [@user]',
    examples: ['balance', 'balance @User'],
    permissions: [],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        let target = ctx.member;
        if (ctx.parsed.args.length > 0) {
            const resolved = await resolveUser(ctx.parsed.args[0], ctx.guild);
            if (resolved.success && resolved.value.member) {
                target = resolved.value.member;
            }
        }
        else if (ctx.replyTarget) {
            target = ctx.replyTarget;
        }
        const config = await getEconomyConfig(ctx.guild.id);
        await ensureBalance(ctx.guild.id, target.id);
        const balance = await getBalance(ctx.guild.id, target.id);
        const payload = buildBalancePayload(target, balance, config.currencySymbol);
        await ctx.channel.send({
            components: payload.components,
            flags: payload.flags,
        });
    },
});
//# sourceMappingURL=balance.js.map
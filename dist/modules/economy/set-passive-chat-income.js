import { defineCommand } from '../../types/command.js';
import { setEconomyConfigField } from '../../core/database/repositories/economyConfigRepo.js';
export default defineCommand({
    name: 'set-passive-chat-income',
    aliases: ['setpassive'],
    module: 'economy',
    description: 'Toggle passive chat income and set amount',
    usage: 'set-passive-chat-income <on|off> [amount]',
    examples: ['set-passive-chat-income on 10', 'set-passive-chat-income off'],
    permissions: ['ManageGuild'],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        const state = ctx.parsed.args[0]?.toLowerCase();
        if (state !== 'on' && state !== 'off') {
            await ctx.respond.error('Use "on" or "off".');
            return;
        }
        const enabled = state === 'on';
        await setEconomyConfigField(ctx.guild.id, 'passiveIncome', enabled);
        let msg = `Passive chat income is now **${state}**.`;
        if (enabled && ctx.parsed.args[1]) {
            const amount = parseInt(ctx.parsed.args[1], 10);
            if (!isNaN(amount) && amount > 0) {
                await setEconomyConfigField(ctx.guild.id, 'passiveAmount', amount);
                msg += ` Amount set to **${amount}** per message (rate limited).`;
            }
        }
        await ctx.respond.success(msg);
    }
});
//# sourceMappingURL=set-passive-chat-income.js.map
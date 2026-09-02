import { defineCommand } from '../../types/command.js';
import { deposit, getBalance } from './economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { parseAmount } from './economyUtils.js';
export default defineCommand({
    name: 'deposit',
    aliases: ['dep'],
    module: 'economy',
    description: 'Deposit cash into your bank',
    usage: 'deposit <amount|all>',
    examples: ['deposit 100', 'deposit 1e6', 'deposit all'],
    permissions: [],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        const amountStr = ctx.parsed.args[0]?.toLowerCase();
        if (!amountStr) {
            await ctx.respond.error('Please specify an amount to deposit or "all".');
            return;
        }
        const config = await getEconomyConfig(ctx.guild.id);
        const balance = await getBalance(ctx.guild.id, ctx.message.author.id);
        let amount = 0;
        if (amountStr === 'all' || amountStr === 'max') {
            if (balance.bankCapacity > 0) {
                const space = Math.max(0, balance.bankCapacity - balance.bank);
                amount = Math.min(balance.cash, space);
            }
            else {
                amount = balance.cash;
            }
        }
        else {
            const parsed = parseAmount(amountStr);
            if (!parsed || parsed <= 0) {
                await ctx.respond.error('Please provide a valid positive number (e.g. `1000`, `1e6`, `50k`, `all`).');
                return;
            }
            amount = parsed;
        }
        if (amount > balance.cash) {
            await ctx.respond.error('You do not have that much cash.');
            return;
        }
        if (balance.bankCapacity > 0 && balance.bank + amount > balance.bankCapacity) {
            await ctx.respond.error('Your bank cannot hold that much.');
            return;
        }
        try {
            const { deposited } = await deposit(ctx.guild.id, ctx.message.author.id, amount);
            await ctx.respond.success(`Successfully deposited **${config.currencySymbol}${deposited.toLocaleString()}** into your bank.`);
        }
        catch (err) {
            await ctx.respond.error(err.message || 'Failed to deposit.');
        }
    },
});
//# sourceMappingURL=deposit.js.map
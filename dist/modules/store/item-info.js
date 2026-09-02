import { defineCommand } from '../../types/command.js';
import { getItem } from './storeService.js';
import { buildItemInfoPayload } from './storeUI.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
export default defineCommand({
    name: 'item-info',
    aliases: ['iteminfo'],
    module: 'store',
    description: 'Shows detailed information about a store item',
    usage: 'item-info <item name or ID>',
    examples: ['item-info 1', 'item-info VIP Role'],
    permissions: [],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        const query = ctx.parsed.args.join(' ');
        if (!query) {
            await ctx.respond.error('Please provide an item name or ID.');
            return;
        }
        const item = await getItem(ctx.guild.id, query);
        if (!item) {
            await ctx.respond.error('Item not found.');
            return;
        }
        const config = await getEconomyConfig(ctx.guild.id);
        const currency = config?.currencySymbol || '$';
        const payload = buildItemInfoPayload(item, currency);
        await ctx.channel.send({
            components: payload.components,
            flags: payload.flags,
        });
    },
});
//# sourceMappingURL=item-info.js.map
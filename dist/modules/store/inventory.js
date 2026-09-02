import { defineCommand } from '../../types/command.js';
import { getInventory } from './storeService.js';
import { buildInventoryPayload } from './storeUI.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
export default defineCommand({
    name: 'inventory',
    aliases: ['inv', 'bag'],
    module: 'store',
    description: 'Shows your inventory or a specified user\'s inventory',
    usage: 'inventory [@user]',
    examples: ['inventory', 'inventory @User'],
    permissions: [],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        let targetUser = ctx.message.author;
        if (ctx.parsed.args.length > 0) {
            const resolved = await resolveUser(ctx.parsed.args[0], ctx.guild);
            if (resolved.success && resolved.value.member) {
                targetUser = resolved.value.member.user;
            }
        }
        const entries = await getInventory(ctx.guild.id, targetUser.id);
        const config = await getEconomyConfig(ctx.guild.id);
        const currency = config?.currencySymbol || '$';
        const payload = buildInventoryPayload(entries, targetUser.username, targetUser.displayAvatarURL({ size: 128 }), currency);
        await ctx.channel.send({
            components: payload.components,
            flags: payload.flags,
        });
    },
});
//# sourceMappingURL=inventory.js.map
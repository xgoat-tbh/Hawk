import { defineCommand } from '../../types/command.js';
import { listIncomeRoles } from './incomeService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { ui } from '../../core/ui/index.js';
export default defineCommand({
    name: 'list-roles',
    aliases: ['incroles', 'incomeroles'],
    module: 'income',
    description: 'List all roles that provide passive income',
    usage: 'list-roles',
    examples: ['list-roles'],
    permissions: [],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        const roles = await listIncomeRoles(ctx.guild.id);
        const config = await getEconomyConfig(ctx.guild.id);
        if (roles.length === 0) {
            await ctx.respond.info('There are currently no income roles configured for this server.');
            return;
        }
        const lines = roles.map(r => `• <@&${r.roleId}> · **${config.currencySymbol}${r.incomeAmount.toLocaleString()}** per cycle`);
        const content = `Roles below provide passive income claimable via \`${ctx.parsed.prefix}collect\`:\n\n${lines.join('\n')}`;
        const payload = ui.standard({
            title: `${ctx.guild.name} Income Roles`,
            text: content,
            thumbnailUrl: ctx.guild.iconURL({ size: 128 }) || undefined,
        });
        await ctx.channel.send({
            components: payload.components,
            flags: payload.flags,
        });
    },
});
//# sourceMappingURL=list-roles.js.map
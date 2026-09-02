import { defineCommand } from '../../types/command.js';
import { getDb } from '../../core/database/pool.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { EmbedBuilder } from 'discord.js';
import { branding } from '../../core/config/branding.js';
export default defineCommand({
    name: 'stats',
    aliases: ['economy-stats'],
    module: 'economy',
    description: 'View server economy statistics',
    usage: 'stats',
    examples: ['stats'],
    permissions: [],
    botPermissions: [],
    cooldown: 5,
    async execute(ctx) {
        const db = getDb();
        const result = await db `
      SELECT 
        SUM(cash) as total_cash,
        SUM(bank) as total_bank,
        COUNT(*) as member_count
      FROM economy_balances
      WHERE guild_id = ${ctx.guild.id}
    `;
        const config = await getEconomyConfig(ctx.guild.id);
        const stats = result[0] || { total_cash: 0, total_bank: 0, member_count: 0 };
        const totalCash = parseInt(stats.total_cash) || 0;
        const totalBank = parseInt(stats.total_bank) || 0;
        const memberCount = parseInt(stats.member_count) || 0;
        const totalCirculation = totalCash + totalBank;
        const embed = new EmbedBuilder()
            .setColor(branding.defaultColor)
            .setTitle(`${ctx.guild.name} Economy Statistics`)
            .addFields({ name: 'Total Cash in Circulation', value: `${config.currencySymbol}${totalCash.toLocaleString()}`, inline: true }, { name: 'Total Bank Holdings', value: `${config.currencySymbol}${totalBank.toLocaleString()}`, inline: true }, { name: 'Total Economy Size', value: `${config.currencySymbol}${totalCirculation.toLocaleString()}`, inline: true }, { name: 'Participating Members', value: `${memberCount.toLocaleString()}`, inline: true });
        await ctx.respond.raw({ embeds: [embed] });
    },
});
//# sourceMappingURL=stats.js.map
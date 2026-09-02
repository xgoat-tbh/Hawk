import { defineCommand } from '../../types/command.js';
import { claimDaily } from '../economy/economyService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
export default defineCommand({
    name: 'daily',
    aliases: ['claim', 'streak', 'dailyreward'],
    module: 'income',
    description: 'Claim your daily currency reward and grow your streak multiplier',
    usage: 'daily',
    examples: ['daily'],
    permissions: [],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        const { guild, message, respond } = ctx;
        const config = await getEconomyConfig(guild.id);
        const result = await claimDaily(guild.id, message.author.id);
        if (!result.success) {
            const nextTimestamp = Math.floor(result.nextClaimDate.getTime() / 1000);
            await respond.warning(`You have already claimed your daily reward.\nNext daily is ready <t:${nextTimestamp}:R> (<t:${nextTimestamp}:t>). Current streak: 🔥 **${result.streak} day(s)**.`);
            return;
        }
        const nextTimestamp = Math.floor(result.nextClaimDate.getTime() / 1000);
        const streakText = result.streakReset
            ? `(Streak reset to 🔥 **1 day**)`
            : `(Streak: 🔥 **${result.streak} days**)`;
        await respond.success(`Claimed **${config.currencySymbol}${result.reward.toLocaleString()}**! ${streakText}\nNext daily available <t:${nextTimestamp}:R>.`);
    },
});
//# sourceMappingURL=daily.js.map
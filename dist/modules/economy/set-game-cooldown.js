import { defineCommand } from '../../types/command.js';
import { setEconomyConfigField } from '../../core/database/repositories/economyConfigRepo.js';
export default defineCommand({
    name: 'set-game-cooldown',
    module: 'economy',
    description: 'Set the cooldown for games/jobs',
    usage: 'set-game-cooldown <work|slut|crime|rob> <seconds>',
    examples: ['set-game-cooldown work 3600'],
    permissions: ['ManageGuild'],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        const game = ctx.parsed.args[0]?.toLowerCase();
        const seconds = parseInt(ctx.parsed.args[1], 10);
        const valid = ['work', 'slut', 'crime', 'rob'];
        if (!game || !valid.includes(game)) {
            await ctx.respond.error('Valid games: ' + valid.join(', '));
            return;
        }
        if (isNaN(seconds) || seconds < 0) {
            await ctx.respond.error('Provide valid seconds.');
            return;
        }
        await setEconomyConfigField(ctx.guild.id, `${game}Cooldown`, seconds);
        await ctx.respond.success(`Cooldown for **${game}** set to **${seconds}s**`);
    }
});
//# sourceMappingURL=set-game-cooldown.js.map
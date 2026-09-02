import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { setBankCapacity, setGuildDefaultBankCapacity } from './economyService.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { parseAmount } from './economyUtils.js';
export default defineCommand({
    name: 'set-bank-capacity',
    aliases: ['setbankcapacity', 'setbanklimit', 'setbankcap'],
    module: 'economy',
    description: 'Set or remove bank capacity for a user or default server capacity',
    usage: 'set-bank-capacity <@user|default> <amount|unlimited|0>',
    examples: ['set-bank-capacity @User 50000', 'set-bank-capacity @User unlimited', 'set-bank-capacity default unlimited'],
    permissions: [PermissionsBitField.Flags.ManageGuild],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        const { parsed, guild, respond } = ctx;
        if (parsed.args.length < 2) {
            await respond.error('Usage: `set-bank-capacity <@user|default> <amount|unlimited|0>`');
            return;
        }
        const targetArg = parsed.args[0].toLowerCase();
        const capacityArg = parsed.args[1].toLowerCase();
        let capacity = 0;
        if (capacityArg !== 'unlimited' && capacityArg !== 'infinite' && capacityArg !== 'none' && capacityArg !== '0') {
            const parsedCap = parseAmount(capacityArg);
            if (parsedCap === null || parsedCap < 0) {
                await respond.error('Please provide a valid positive capacity (e.g. `50000`, `1e6`, `1m`) or "unlimited".');
                return;
            }
            capacity = parsedCap;
        }
        const capDisplay = capacity > 0 ? capacity.toLocaleString() : 'Unlimited';
        if (targetArg === 'default' || targetArg === 'server' || targetArg === 'all') {
            const updatedCount = await setGuildDefaultBankCapacity(guild.id, capacity);
            await respond.success(`Updated bank capacity for **${updatedCount}** user(s) to **${capDisplay}**.`);
            return;
        }
        const resolved = await resolveUser(parsed.args[0], guild);
        if (!resolved.success) {
            await respond.error(resolved.error);
            return;
        }
        await setBankCapacity(guild.id, resolved.value.id, capacity);
        await respond.success(`Set bank capacity for ${mentionUser(resolved.value.id)} to **${capDisplay}**.`);
    },
});
//# sourceMappingURL=set-bank-capacity.js.map
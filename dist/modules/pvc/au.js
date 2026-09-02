import { defineCommand } from '../../types/command.js';
import { getSessionByOwner, addAccess } from './pvcService.js';
export default defineCommand({
    name: 'au',
    aliases: ['allow-user', 'allowuser', 'pvc-permit'],
    module: 'pvc',
    description: 'Allow users into your PVC',
    usage: 'au <@user1> [@user2]',
    examples: ['au @friend'],
    permissions: [],
    botPermissions: [],
    cooldown: 3,
    async execute(ctx) {
        const session = await getSessionByOwner(ctx.guild.id, ctx.message.author.id);
        if (!session) {
            ctx.respond.error("You don't have an active PVC.");
            return;
        }
        const mentions = Array.from(ctx.message.mentions.users.values());
        if (mentions.length === 0) {
            ctx.respond.error('Please mention at least one user to allow.');
            return;
        }
        const channel = ctx.guild.channels.cache.get(session.channelId);
        let count = 0;
        for (const user of mentions) {
            await addAccess(session.channelId, user.id, 'USER', 'ALLOW');
            if (channel && channel.isVoiceBased()) {
                await channel.permissionOverwrites.edit(user.id, {
                    Connect: true,
                    ViewChannel: true,
                    Speak: true
                });
            }
            count++;
        }
        await ctx.respond.success(`Permitted ${count} user(s) to join your PVC.`);
    },
});
//# sourceMappingURL=au.js.map
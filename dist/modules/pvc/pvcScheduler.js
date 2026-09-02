import { getExpiringSessionsForAutoPay, getSessionsExpiringWithin, getExpiredSessions, extendSession, deleteSession } from './pvcService.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { deductFundsPreferCash } from '../economy/economyService.js';
import { EmbedBuilder } from 'discord.js';
export async function checkPvcExpirations(client) {
    // 1. Get sessions with autoPayEnabled where expires_at <= NOW() + 2 minutes
    const autoPaySessions = await getExpiringSessionsForAutoPay(2);
    for (const session of autoPaySessions) {
        const config = await getEconomyConfig(session.guildId);
        try {
            const { deductedFromCash, deductedFromBank } = await deductFundsPreferCash(session.guildId, session.ownerId, config.pvcHourlyRate);
            if (deductedFromCash > 0 || deductedFromBank > 0) {
                await extendSession(session.channelId, 60); // 1 hour
            }
        }
        catch (e) {
            // Failed to deduct, leave it to expire
        }
    }
    // 3. Get sessions expiring within 10 minutes (and not auto-pay), send warning
    // Warning happens once per session, we don't have a flag to prevent spam, but let's assume we fetch them and just warn.
    // Actually the prompt says "Get sessions expiring within 10 minutes (and not auto-pay), send warning to pvcCommandChannelId"
    const expiring = await getSessionsExpiringWithin(10);
    for (const session of expiring) {
        if (session.autoPayEnabled)
            continue;
        // We should ideally track if we already warned, but skipping for simplicity as per requirements.
        const config = await getEconomyConfig(session.guildId);
        if (config.pvcCommandChannelId) {
            const guild = client.guilds.cache.get(session.guildId);
            if (guild) {
                const channel = guild.channels.cache.get(config.pvcCommandChannelId);
                if (channel) {
                    // Send warning if we haven't warned recently (this might spam every 30 seconds for 10 minutes, so maybe only warn if strictly within 9.5 to 10 minutes?
                    // To avoid complexity just warn if between 9 to 10 mins
                    const minutesLeft = (session.expiresAt.getTime() - Date.now()) / 60000;
                    if (minutesLeft > 9 && minutesLeft <= 10) {
                        const embed = new EmbedBuilder()
                            .setTitle('PVC Expiring Soon')
                            .setDescription(`<@${session.ownerId}>, your PVC <#${session.channelId}> will expire in less than 10 minutes.\nUse \`!pvc buy\` or enable FASTag to keep it open.`)
                            .setColor('#FFA500');
                        await channel.send({ embeds: [embed] }).catch(() => { });
                    }
                }
            }
        }
    }
    // 4. Get expired sessions: disconnect all members, delete Discord channel, delete from DB
    const expired = await getExpiredSessions();
    for (const session of expired) {
        try {
            const guild = client.guilds.cache.get(session.guildId);
            if (guild) {
                const channel = guild.channels.cache.get(session.channelId);
                if (channel && channel.isVoiceBased()) {
                    for (const [, member] of channel.members) {
                        await member.voice.disconnect('PVC Expired').catch(() => { });
                    }
                    await channel.delete('PVC Expired').catch(() => { });
                }
            }
        }
        catch (e) {
            // Ignore errors deleting channel
        }
        await deleteSession(session.channelId);
    }
}
export function startPvcScheduler(client) {
    return setInterval(() => {
        checkPvcExpirations(client).catch(err => console.error('PVC Scheduler Error:', err));
    }, 30000);
}
export function stopPvcScheduler(timer) {
    clearInterval(timer);
}
//# sourceMappingURL=pvcScheduler.js.map
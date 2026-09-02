import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';
import { getSessionByOwner, createSession } from './pvcService.js';
import { deductFundsPreferCash } from '../economy/economyService.js';
import { EmbedBuilder } from 'discord.js';
import { getDb } from '../../core/database/pool.js';
export async function handlePvcVoiceStateUpdate(oldState, newState) {
    const guild = newState.guild;
    const config = await getEconomyConfig(guild.id);
    if (!config.pvcJtcChannelId)
        return;
    // Join JTC channel
    if (newState.channelId === config.pvcJtcChannelId && oldState.channelId !== newState.channelId) {
        const member = newState.member;
        if (!member)
            return;
        let existingSession = await getSessionByOwner(guild.id, member.id);
        const db = getDb();
        // Check if user has a pending session
        if (!existingSession) {
            const pendingChannelId = 'pending-' + member.id;
            const rows = await db `SELECT * FROM pvc_sessions WHERE channel_id = ${pendingChannelId} AND guild_id = ${guild.id}`;
            if (rows.length > 0) {
                existingSession = {
                    channelId: rows[0].channel_id,
                    guildId: rows[0].guild_id,
                    ownerId: rows[0].owner_id,
                    expiresAt: rows[0].expires_at,
                    autoPayEnabled: rows[0].auto_pay_enabled,
                    isLocked: rows[0].is_locked,
                    isHidden: rows[0].is_hidden,
                    userLimit: rows[0].user_limit,
                };
            }
        }
        if (existingSession && existingSession.expiresAt > new Date()) {
            // Re-create or move member to existing channel
            let vc = existingSession.channelId.startsWith('pending-') ? null : guild.channels.cache.get(existingSession.channelId);
            if (!vc) {
                // Create new VC
                vc = await guild.channels.create({
                    name: `${member.user.username}'s PVC`,
                    type: ChannelType.GuildVoice,
                    parent: config.pvcCategoryId || undefined,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            allow: [],
                            deny: existingSession.isHidden ? [PermissionFlagsBits.ViewChannel] : (existingSession.isLocked ? [PermissionFlagsBits.Connect] : [])
                        },
                        {
                            id: member.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ViewChannel],
                        }
                    ],
                    userLimit: existingSession.userLimit || 0
                });
                // Update session channel ID in DB
                await db `UPDATE pvc_sessions SET channel_id = ${vc.id} WHERE channel_id = ${existingSession.channelId}`;
            }
            await member.voice.setChannel(vc).catch(() => { });
            return;
        }
        // No session or expired session, try auto-buy 1 hour
        if (!existingSession || existingSession.expiresAt <= new Date()) {
            try {
                await deductFundsPreferCash(guild.id, member.id, config.pvcHourlyRate);
                // Create new VC
                const vc = await guild.channels.create({
                    name: `${member.user.username}'s PVC`,
                    type: ChannelType.GuildVoice,
                    parent: config.pvcCategoryId || undefined,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            allow: [],
                        },
                        {
                            id: member.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ViewChannel],
                        }
                    ],
                });
                if (existingSession) {
                    await db `UPDATE pvc_sessions SET expires_at = ${new Date(Date.now() + 3600000)}, channel_id = ${vc.id} WHERE channel_id = ${existingSession.channelId}`;
                }
                else {
                    await createSession(vc.id, guild.id, member.id, 1);
                }
                await member.voice.setChannel(vc).catch(() => { });
            }
            catch (e) {
                // Insufficient funds
                await member.voice.disconnect('Insufficient funds for PVC').catch(() => { });
                if (config.pvcCommandChannelId) {
                    const channel = guild.channels.cache.get(config.pvcCommandChannelId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setTitle('Insufficient Funds')
                            .setDescription(`<@${member.id}>, you do not have enough funds to create a PVC. Use \`!pvc buy <hours>\` to purchase VC time. Hourly rate is **${config.pvcHourlyRate}**.`)
                            .setColor('#FF0000');
                        await channel.send({ embeds: [embed] }).catch(() => { });
                    }
                }
            }
        }
    }
    // Handle leaves - if channel is empty and is a PVC, we leave it alone since scheduler handles expiry, but maybe delete if we want?
    // Requirements: "if it's empty and the session exists, optionally keep it alive (don't delete, let scheduler handle expiry)"
    // So we don't need to do anything.
}
//# sourceMappingURL=_pvcGatekeeper.js.map
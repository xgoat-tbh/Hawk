import { getDb } from '../../core/database/pool.js';
import { deductFundsPreferCash, ensureBalance } from '../economy/economyService.js';
function mapSessionRow(row) {
    return {
        channelId: row.channel_id,
        guildId: row.guild_id,
        ownerId: row.owner_id,
        expiresAt: row.expires_at,
        autoPayEnabled: row.auto_pay_enabled,
        isLocked: row.is_locked,
        isHidden: row.is_hidden,
        userLimit: row.user_limit,
    };
}
function mapAccessRow(row) {
    return {
        channelId: row.channel_id,
        targetId: row.target_id,
        targetType: row.target_type,
        access: row.access,
    };
}
export async function createSession(channelId, guildId, ownerId, hours) {
    const db = getDb();
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const rows = await db `
    INSERT INTO pvc_sessions (channel_id, guild_id, owner_id, expires_at)
    VALUES (${channelId}, ${guildId}, ${ownerId}, ${expiresAt})
    RETURNING *
  `;
    return mapSessionRow(rows[0]);
}
export async function getSession(channelId) {
    const db = getDb();
    const rows = await db `SELECT * FROM pvc_sessions WHERE channel_id = ${channelId}`;
    if (!rows.length)
        return null;
    return mapSessionRow(rows[0]);
}
export async function getSessionByOwner(guildId, ownerId) {
    const db = getDb();
    const rows = await db `
    SELECT * FROM pvc_sessions
    WHERE guild_id = ${guildId} AND owner_id = ${ownerId}
  `;
    if (!rows.length)
        return null;
    return mapSessionRow(rows[0]);
}
export async function extendSession(channelId, minutes) {
    const db = getDb();
    await db `
    UPDATE pvc_sessions
    SET expires_at = expires_at + (${minutes} * interval '1 minute')
    WHERE channel_id = ${channelId}
  `;
}
export async function deleteSession(channelId) {
    const db = getDb();
    await db `DELETE FROM pvc_sessions WHERE channel_id = ${channelId}`;
}
export async function setAutoPayEnabled(channelId, enabled) {
    const db = getDb();
    await db `UPDATE pvc_sessions SET auto_pay_enabled = ${enabled} WHERE channel_id = ${channelId}`;
}
export async function setLocked(channelId, locked) {
    const db = getDb();
    await db `UPDATE pvc_sessions SET is_locked = ${locked} WHERE channel_id = ${channelId}`;
}
export async function setHidden(channelId, hidden) {
    const db = getDb();
    await db `UPDATE pvc_sessions SET is_hidden = ${hidden} WHERE channel_id = ${channelId}`;
}
export async function setUserLimit(channelId, limit) {
    const db = getDb();
    await db `UPDATE pvc_sessions SET user_limit = ${limit} WHERE channel_id = ${channelId}`;
}
export async function transferOwnership(channelId, newOwnerId) {
    const db = getDb();
    await db `UPDATE pvc_sessions SET owner_id = ${newOwnerId} WHERE channel_id = ${channelId}`;
}
export async function addAccess(channelId, targetId, targetType, access) {
    const db = getDb();
    await db `
    INSERT INTO pvc_access (channel_id, target_id, target_type, access)
    VALUES (${channelId}, ${targetId}, ${targetType}, ${access})
    ON CONFLICT (channel_id, target_id)
    DO UPDATE SET access = ${access}
  `;
}
export async function removeAccess(channelId, targetId) {
    const db = getDb();
    await db `DELETE FROM pvc_access WHERE channel_id = ${channelId} AND target_id = ${targetId}`;
}
export async function getAccessList(channelId) {
    const db = getDb();
    const rows = await db `SELECT * FROM pvc_access WHERE channel_id = ${channelId}`;
    return rows.map(mapAccessRow);
}
export async function getExpiringSessionsForAutoPay(thresholdMinutes) {
    const db = getDb();
    const rows = await db `
    SELECT * FROM pvc_sessions
    WHERE auto_pay_enabled = true
    AND expires_at <= NOW() + (${thresholdMinutes} * interval '1 minute')
  `;
    return rows.map(mapSessionRow);
}
export async function getExpiredSessions() {
    const db = getDb();
    const rows = await db `SELECT * FROM pvc_sessions WHERE expires_at <= NOW()`;
    return rows.map(mapSessionRow);
}
export async function getSessionsExpiringWithin(minutes) {
    const db = getDb();
    const rows = await db `
    SELECT * FROM pvc_sessions
    WHERE expires_at <= NOW() + (${minutes} * interval '1 minute')
  `;
    return rows.map(mapSessionRow);
}
export async function buyPvcTime(guildId, userId, hours, hourlyRate) {
    const db = getDb();
    const totalCost = hours * hourlyRate;
    await ensureBalance(guildId, userId);
    const result = await db.begin(async (tx) => {
        await deductFundsPreferCash(guildId, userId, totalCost);
        // Check if user already has a session
        const existing = await tx `SELECT * FROM pvc_sessions WHERE guild_id = ${guildId} AND owner_id = ${userId}`;
        if (existing.length > 0) {
            await tx `
        UPDATE pvc_sessions
        SET expires_at = expires_at + (${hours * 60} * interval '1 minute')
        WHERE channel_id = ${existing[0].channel_id}
      `;
            return { channelId: existing[0].channel_id, extended: true };
        }
        // No session exists, user bought time. We DO NOT create session here because there's no channel yet.
        // Wait, the spec says: "create or extend session... If user already has a session, extend it. Otherwise the actual channel creation happens in the gatekeeper."
        // But we need a place to store that they paid for time before they join the gatekeeper.
        // Or wait, they get refunded if they don't have a channel?
        // Let's create a "pending" session with channelId = 'pending-' + userId, then update it later?
        // The requirement says: "Otherwise the actual channel creation happens in the gatekeeper."
        // Let's create a pending session where channelId = ownerId + '-pending'.
        const pendingChannelId = 'pending-' + userId;
        const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
        // actually, let's just insert with 'pending-' + userId as channel_id. 
        // wait, what if they buy 2 hours, then another 2 hours before joining?
        // Let's see if pending channel exists
        const existingPending = await tx `SELECT * FROM pvc_sessions WHERE guild_id = ${guildId} AND channel_id = ${pendingChannelId}`;
        if (existingPending.length > 0) {
            await tx `
        UPDATE pvc_sessions
        SET expires_at = expires_at + (${hours * 60} * interval '1 minute')
        WHERE channel_id = ${pendingChannelId}
      `;
            return { channelId: pendingChannelId, extended: true };
        }
        await tx `
      INSERT INTO pvc_sessions (channel_id, guild_id, owner_id, expires_at)
      VALUES (${pendingChannelId}, ${guildId}, ${userId}, ${expiresAt})
    `;
        return { channelId: pendingChannelId, extended: false };
    });
    return result;
}
//# sourceMappingURL=pvcService.js.map
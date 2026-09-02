import { getDb } from '../pool.js';
// In-memory cache for hot-path AFK checks in messageCreate: guildId -> userId -> CachedAfk
const afkCache = new Map();
export function getAfkCacheSize() {
    let count = 0;
    for (const guildMap of afkCache.values()) {
        count += guildMap.size;
    }
    return count;
}
export function getAfkEntriesForGuild(guildId) {
    const guildMap = afkCache.get(guildId);
    if (!guildMap)
        return [];
    const entries = [];
    guildMap.forEach((val, userId) => {
        entries.push({ userId, ...val });
    });
    return entries;
}
export async function clearAllAfkRecords(guildId) {
    if (guildId) {
        afkCache.delete(guildId);
    }
    else {
        afkCache.clear();
    }
    try {
        const db = getDb();
        if (guildId) {
            await db `DELETE FROM afk_users WHERE guild_id = ${guildId}`;
        }
        else {
            await db `TRUNCATE TABLE afk_users`;
        }
    }
    catch {
        // Ignore DB errors
    }
}
export async function loadAfkCache() {
    afkCache.clear();
    try {
        const db = getDb();
        const rows = await db `SELECT guild_id, user_id, reason, started_at, channel_id, message_id FROM afk_users`;
        for (const row of rows) {
            const guildId = row.guild_id;
            const userId = row.user_id;
            const reason = row.reason;
            const startedAt = new Date(row.started_at);
            const channelId = row.channel_id ?? null;
            const messageId = row.message_id ?? null;
            if (!afkCache.has(guildId)) {
                afkCache.set(guildId, new Map());
            }
            afkCache.get(guildId).set(userId, { reason, startedAt, channelId, messageId });
        }
        return rows.length;
    }
    catch {
        return 0;
    }
}
export async function setAfk(guildId, userId, reason, channelId, messageId) {
    const startedAt = new Date();
    try {
        const db = getDb();
        await db `
      INSERT INTO afk_users (guild_id, user_id, reason, started_at, channel_id, message_id)
      VALUES (${guildId}, ${userId}, ${reason}, ${startedAt}, ${channelId ?? null}, ${messageId ?? null})
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET reason = ${reason}, started_at = ${startedAt}, channel_id = ${channelId ?? null}, message_id = ${messageId ?? null}
    `;
    }
    catch {
        // Ignore DB errors if database is unavailable
    }
    if (!afkCache.has(guildId)) {
        afkCache.set(guildId, new Map());
    }
    const cached = { reason, startedAt, channelId: channelId ?? null, messageId: messageId ?? null };
    afkCache.get(guildId).set(userId, cached);
    return cached;
}
export async function updateAfkMessageInfo(guildId, userId, channelId, messageId) {
    const cached = afkCache.get(guildId)?.get(userId);
    if (cached) {
        cached.channelId = channelId;
        cached.messageId = messageId;
    }
    try {
        const db = getDb();
        await db `
      UPDATE afk_users
      SET channel_id = ${channelId}, message_id = ${messageId}
      WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;
    }
    catch {
        // Ignore DB error
    }
}
export async function removeAfk(guildId, userId) {
    const guildMap = afkCache.get(guildId);
    const cached = guildMap?.get(userId) ?? null;
    guildMap?.delete(userId);
    if (guildMap && guildMap.size === 0) {
        afkCache.delete(guildId);
    }
    try {
        const db = getDb();
        const rows = await db `
      DELETE FROM afk_users
      WHERE guild_id = ${guildId} AND user_id = ${userId}
      RETURNING reason, started_at, channel_id, message_id
    `;
        if (rows.length > 0) {
            return {
                reason: rows[0].reason,
                startedAt: new Date(rows[0].started_at),
                channelId: rows[0].channel_id ?? null,
                messageId: rows[0].message_id ?? null,
            };
        }
    }
    catch {
        // Ignore DB errors on remove
    }
    return cached;
}
export function getAfk(guildId, userId) {
    return afkCache.get(guildId)?.get(userId) ?? null;
}
export function isAfk(guildId, userId) {
    return afkCache.get(guildId)?.has(userId) ?? false;
}
//# sourceMappingURL=afkRepo.js.map
import { getDb } from '../database/pool.js';
const noPrefixUsers = new Map();
function makeKey(guildId, userId) {
    return `${guildId}:${userId}`;
}
export function isNoPrefixEnabled(guildId, userId) {
    return noPrefixUsers.get(makeKey(guildId, userId)) === true;
}
export function getNoPrefixUsersForGuild(guildId) {
    const prefix = `${guildId}:`;
    const result = [];
    for (const [key, enabled] of noPrefixUsers.entries()) {
        if (enabled && key.startsWith(prefix)) {
            result.push(key.slice(prefix.length));
        }
    }
    return result;
}
export async function setNoPrefix(guildId, userId, enabled) {
    const key = makeKey(guildId, userId);
    if (enabled) {
        noPrefixUsers.set(key, true);
    }
    else {
        noPrefixUsers.delete(key);
    }
    try {
        const db = getDb();
        if (enabled) {
            await db `
        INSERT INTO no_prefix_users (guild_id, user_id, enabled)
        VALUES (${guildId}, ${userId}, true)
        ON CONFLICT (guild_id, user_id)
        DO UPDATE SET enabled = true
      `;
        }
        else {
            await db `
        DELETE FROM no_prefix_users
        WHERE guild_id = ${guildId} AND user_id = ${userId}
      `;
        }
    }
    catch {
        // Database operation error handled gracefully
    }
}
export async function toggleNoPrefix(guildId, userId) {
    const current = isNoPrefixEnabled(guildId, userId);
    const next = !current;
    await setNoPrefix(guildId, userId, next);
    return next;
}
export async function loadNoPrefixCache() {
    try {
        const db = getDb();
        const rows = await db `SELECT guild_id, user_id, enabled FROM no_prefix_users WHERE enabled = true`;
        noPrefixUsers.clear();
        for (const row of rows) {
            noPrefixUsers.set(makeKey(row.guild_id, row.user_id), true);
        }
    }
    catch {
        // Fallback if DB table not populated yet
    }
}
//# sourceMappingURL=NoPrefixConfig.js.map
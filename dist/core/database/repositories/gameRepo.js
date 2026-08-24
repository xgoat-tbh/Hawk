import { getDb } from '../pool.js';
export async function createGamePing(input) {
    const db = getDb();
    const lowerId = input.identifier.toLowerCase();
    const cooldown = input.cooldownSeconds ?? 300;
    const rows = await db `
    INSERT INTO game_pings (guild_id, identifier, game_name, role_id, vc_id, cooldown_seconds)
    VALUES (${input.guildId}, ${lowerId}, ${input.gameName}, ${input.roleId}, ${input.vcId}, ${cooldown})
    RETURNING id, guild_id, identifier, game_name, role_id, vc_id, cooldown_seconds, created_at, updated_at
  `;
    return mapPingRow(rows[0]);
}
export async function getGamePing(guildId, identifier) {
    const db = getDb();
    const lowerId = identifier.toLowerCase();
    const rows = await db `
    SELECT * FROM game_pings
    WHERE guild_id = ${guildId} AND identifier = ${lowerId}
  `;
    if (rows.length === 0)
        return null;
    return mapPingRow(rows[0]);
}
export async function updateGamePing(guildId, identifier, updates) {
    const db = getDb();
    const lowerId = identifier.toLowerCase();
    const existing = await getGamePing(guildId, lowerId);
    if (!existing)
        return null;
    const newIdentifier = updates.newIdentifier ? updates.newIdentifier.toLowerCase() : existing.identifier;
    const newGameName = updates.gameName ?? existing.gameName;
    const newRoleId = updates.roleId ?? existing.roleId;
    const newVcId = updates.vcId ?? existing.vcId;
    const newCooldown = updates.cooldownSeconds ?? existing.cooldownSeconds;
    const rows = await db `
    UPDATE game_pings
    SET identifier = ${newIdentifier},
        game_name = ${newGameName},
        role_id = ${newRoleId},
        vc_id = ${newVcId},
        cooldown_seconds = ${newCooldown},
        updated_at = NOW()
    WHERE id = ${existing.id}
    RETURNING id, guild_id, identifier, game_name, role_id, vc_id, cooldown_seconds, created_at, updated_at
  `;
    if (rows.length === 0)
        return null;
    return mapPingRow(rows[0]);
}
export async function deleteGamePing(guildId, identifier) {
    const db = getDb();
    const lowerId = identifier.toLowerCase();
    const result = await db `
    DELETE FROM game_pings
    WHERE guild_id = ${guildId} AND identifier = ${lowerId}
  `;
    return result.count > 0;
}
export async function listGamePings(guildId) {
    const db = getDb();
    let rows = await db `
    SELECT * FROM game_pings
    WHERE guild_id = ${guildId}
    ORDER BY identifier ASC
  `;
    if (rows.length === 0) {
        try {
            const oldRows = await db `
        SELECT g.id, g.guild_id, g.identifier, g.name as game_name, g.role_id, COALESCE(v.vc_id, '') as vc_id, COALESCE(v.cooldown_seconds, 300) as cooldown_seconds, g.created_at, g.updated_at
        FROM games g
        LEFT JOIN game_vcs v ON v.game_id = g.id
        WHERE g.guild_id = ${guildId}
      `;
            if (oldRows.length > 0) {
                rows = oldRows;
            }
        }
        catch {
            // Old legacy table does not exist
        }
    }
    return rows.map(mapPingRow);
}
function mapPingRow(row) {
    return {
        id: row.id,
        guildId: row.guild_id,
        identifier: row.identifier,
        gameName: row.game_name,
        roleId: row.role_id,
        vcId: row.vc_id,
        cooldownSeconds: row.cooldown_seconds,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
// Backward compatibility alias functions
export const getGame = getGamePing;
export const deleteGame = deleteGamePing;
const testChannelCache = new Map(); // guildId -> channelId or null
export async function setGameTestChannel(guildId, channelId) {
    testChannelCache.set(guildId, channelId);
    try {
        const db = getDb();
        if (channelId) {
            await db `
        INSERT INTO game_guild_configs (guild_id, test_channel_id, updated_at)
        VALUES (${guildId}, ${channelId}, NOW())
        ON CONFLICT (guild_id)
        DO UPDATE SET test_channel_id = ${channelId}, updated_at = NOW()
      `;
        }
        else {
            await db `
        DELETE FROM game_guild_configs WHERE guild_id = ${guildId}
      `;
        }
    }
    catch {
        // Graceful fallback
    }
}
export async function getGameTestChannel(guildId) {
    if (testChannelCache.has(guildId)) {
        return testChannelCache.get(guildId) ?? null;
    }
    try {
        const db = getDb();
        const rows = await db `SELECT test_channel_id FROM game_guild_configs WHERE guild_id = ${guildId}`;
        if (rows.length === 0 || !rows[0].test_channel_id) {
            testChannelCache.set(guildId, null);
            return null;
        }
        const channelId = rows[0].test_channel_id;
        testChannelCache.set(guildId, channelId);
        return channelId;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=gameRepo.js.map
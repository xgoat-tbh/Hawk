import { getDb } from '../pool.js';
const restrictionCache = new Map(); // guildId -> RestrictionRecord[]
export function invalidateRestrictionCache(guildId) {
    restrictionCache.delete(guildId);
}
export async function getRestrictionsForGuild(guildId) {
    const cached = restrictionCache.get(guildId);
    if (cached)
        return cached;
    try {
        const db = getDb();
        const rows = await db `SELECT * FROM restrictions WHERE guild_id = ${guildId} ORDER BY created_at`;
        const mapped = rows.map(mapRestrictionRow);
        restrictionCache.set(guildId, mapped);
        return mapped;
    }
    catch {
        return [];
    }
}
export async function getRestrictions(guildId, commandName, moduleName) {
    const all = await getRestrictionsForGuild(guildId);
    return all.filter((r) => {
        const matchCmd = r.commandName === commandName || r.commandName === null;
        const matchMod = r.moduleName === moduleName;
        return matchCmd && matchMod;
    });
}
export async function checkRestriction(guildId, commandName, moduleName, channelId, categoryId, userId, roleIds) {
    const all = await getRestrictionsForGuild(guildId);
    const channelRestrictions = all.filter((r) => {
        if (r.locationType !== 'channel' || r.locationId !== channelId)
            return false;
        const matchCmd = r.commandName === commandName || r.commandName === null;
        const matchMod = r.moduleName === moduleName;
        return matchCmd && matchMod;
    });
    const channelResult = evaluateRestrictions(channelRestrictions, userId, roleIds);
    if (channelResult !== null) {
        return { restricted: channelResult === 'deny', effect: channelResult };
    }
    if (categoryId) {
        const categoryRestrictions = all.filter((r) => {
            if (r.locationType !== 'category' || r.locationId !== categoryId)
                return false;
            const matchCmd = r.commandName === commandName || r.commandName === null;
            const matchMod = r.moduleName === moduleName;
            return matchCmd && matchMod;
        });
        const categoryResult = evaluateRestrictions(categoryRestrictions, userId, roleIds);
        if (categoryResult !== null) {
            return { restricted: categoryResult === 'deny', effect: categoryResult };
        }
    }
    return { restricted: false, effect: 'inherit' };
}
export async function addRestriction(guildId, commandName, moduleName, targetType, targetId, locationType, locationId, effect) {
    const db = getDb();
    await db `
    INSERT INTO restrictions (guild_id, command_name, module_name, target_type, target_id, location_type, location_id, effect)
    VALUES (${guildId}, ${commandName}, ${moduleName}, ${targetType}, ${targetId}, ${locationType}, ${locationId}, ${effect})
    ON CONFLICT (guild_id, command_name, module_name, target_type, target_id, location_type, location_id)
    DO UPDATE SET effect = ${effect}
  `;
    invalidateRestrictionCache(guildId);
}
export async function removeRestriction(guildId, commandName, moduleName, targetType, targetId, locationType, locationId) {
    const db = getDb();
    const result = await db `
    DELETE FROM restrictions
    WHERE guild_id = ${guildId}
      AND command_name IS NOT DISTINCT FROM ${commandName}
      AND module_name = ${moduleName}
      AND target_type IS NOT DISTINCT FROM ${targetType}
      AND target_id IS NOT DISTINCT FROM ${targetId}
      AND location_type = ${locationType}
      AND location_id = ${locationId}
  `;
    invalidateRestrictionCache(guildId);
    return result.count > 0;
}
function evaluateRestrictions(rows, userId, roleIds) {
    if (rows.length === 0)
        return null;
    for (const row of rows) {
        if (row.targetType === 'user' && row.targetId === userId) {
            return row.effect;
        }
    }
    for (const row of rows) {
        if (row.targetType === 'role' && row.targetId && roleIds.includes(row.targetId)) {
            return row.effect;
        }
    }
    for (const row of rows) {
        if (row.targetType === null) {
            return row.effect;
        }
    }
    return null;
}
function mapRestrictionRow(row) {
    return {
        id: row.id,
        guildId: row.guild_id,
        commandName: row.command_name,
        moduleName: row.module_name,
        targetType: row.target_type,
        targetId: row.target_id,
        locationType: row.location_type,
        locationId: row.location_id,
        effect: row.effect,
        createdAt: row.created_at,
    };
}
//# sourceMappingURL=restrictionRepo.js.map
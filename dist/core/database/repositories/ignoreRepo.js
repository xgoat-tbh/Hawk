import { getDb } from '../pool.js';
const ignoreCache = new Map(); // guildId -> IgnoreRecord[]
export function invalidateIgnoreCache(guildId) {
    ignoreCache.delete(guildId);
}
export async function getIgnoresForGuild(guildId) {
    const cached = ignoreCache.get(guildId);
    if (cached)
        return cached;
    try {
        const db = getDb();
        const rows = await db `SELECT * FROM ignored_entities WHERE guild_id = ${guildId} ORDER BY created_at`;
        const mapped = rows.map(mapIgnoreRow);
        ignoreCache.set(guildId, mapped);
        return mapped;
    }
    catch {
        return [];
    }
}
export async function isIgnored(guildId, entityType, entityId, commandName, moduleName) {
    const ignores = await getIgnoresForGuild(guildId);
    return ignores.some((rec) => {
        if (rec.mode !== 'bl')
            return false;
        if (rec.entityType !== entityType || rec.entityId !== entityId)
            return false;
        const globalScope = rec.scopeType === null && rec.scopeId === null;
        const cmdScope = rec.scopeType === 'command' && rec.scopeId === (commandName ?? null);
        const modScope = rec.scopeType === 'module' && rec.scopeId === (moduleName ?? null);
        return globalScope || cmdScope || modScope;
    });
}
export async function isAnyRoleIgnored(guildId, roleIds, commandName, moduleName) {
    if (roleIds.length === 0)
        return false;
    const ignores = await getIgnoresForGuild(guildId);
    return ignores.some((rec) => {
        if (rec.mode !== 'bl')
            return false;
        if (rec.entityType !== 'role' || !roleIds.includes(rec.entityId))
            return false;
        const globalScope = rec.scopeType === null && rec.scopeId === null;
        const cmdScope = rec.scopeType === 'command' && rec.scopeId === (commandName ?? null);
        const modScope = rec.scopeType === 'module' && rec.scopeId === (moduleName ?? null);
        return globalScope || cmdScope || modScope;
    });
}
export async function addIgnore(guildId, entityType, entityId, scopeType, scopeId, mode = 'bl') {
    const db = getDb();
    await db `
    INSERT INTO ignored_entities (guild_id, entity_type, entity_id, scope_type, scope_id, mode)
    VALUES (${guildId}, ${entityType}, ${entityId}, ${scopeType}, ${scopeId}, ${mode})
    ON CONFLICT (guild_id, entity_type, entity_id, scope_type, scope_id)
    DO UPDATE SET mode = ${mode}
  `;
    invalidateIgnoreCache(guildId);
}
export async function removeIgnore(guildId, entityType, entityId, scopeType, scopeId, mode) {
    const db = getDb();
    let result;
    if (mode) {
        result = await db `
      DELETE FROM ignored_entities
      WHERE guild_id = ${guildId}
        AND entity_type = ${entityType}
        AND entity_id = ${entityId}
        AND scope_type IS NOT DISTINCT FROM ${scopeType}
        AND scope_id IS NOT DISTINCT FROM ${scopeId}
        AND mode = ${mode}
    `;
    }
    else {
        result = await db `
      DELETE FROM ignored_entities
      WHERE guild_id = ${guildId}
        AND entity_type = ${entityType}
        AND entity_id = ${entityId}
        AND scope_type IS NOT DISTINCT FROM ${scopeType}
        AND scope_id IS NOT DISTINCT FROM ${scopeId}
    `;
    }
    invalidateIgnoreCache(guildId);
    return result.count > 0;
}
export async function getIgnoreEntries(guildId) {
    return getIgnoresForGuild(guildId);
}
function mapIgnoreRow(row) {
    return {
        id: row.id,
        guildId: row.guild_id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        scopeType: row.scope_type,
        scopeId: row.scope_id,
        mode: row.mode || 'bl',
        createdAt: new Date(row.created_at),
    };
}
//# sourceMappingURL=ignoreRepo.js.map
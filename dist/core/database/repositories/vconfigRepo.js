import { getDb } from '../pool.js';
const vconfigCache = new Map(); // guildId -> VConfigRule[]
export function invalidateVConfigCache(guildId) {
    vconfigCache.delete(guildId);
}
export async function getVConfigRulesForGuild(guildId) {
    const cached = vconfigCache.get(guildId);
    if (cached)
        return cached;
    try {
        const db = getDb();
        const rows = await db `
      SELECT * FROM vconfig_rules
      WHERE guild_id = ${guildId}
      ORDER BY command_name, role_id
    `;
        const mapped = rows.map(mapVConfigRow);
        vconfigCache.set(guildId, mapped);
        return mapped;
    }
    catch {
        return [];
    }
}
export async function saveVConfigRule(guildId, commandName, roleId, mode, channelIds) {
    const db = getDb();
    const rows = await db `
    INSERT INTO vconfig_rules (guild_id, command_name, role_id, mode, channel_ids, updated_at)
    VALUES (${guildId}, ${commandName}, ${roleId}, ${mode}, ${channelIds}, NOW())
    ON CONFLICT (guild_id, command_name, role_id, mode)
    DO UPDATE SET channel_ids = ${channelIds}, updated_at = NOW()
    RETURNING *
  `;
    invalidateVConfigCache(guildId);
    return mapVConfigRow(rows[0]);
}
export async function removeVConfigRule(guildId, commandName, roleId, mode) {
    const db = getDb();
    const result = await db `
    DELETE FROM vconfig_rules
    WHERE guild_id = ${guildId}
      AND command_name = ${commandName}
      AND role_id = ${roleId}
      AND mode = ${mode}
  `;
    invalidateVConfigCache(guildId);
    return result.count > 0;
}
export async function getVConfigRules(guildId, commandName, roleId) {
    const all = await getVConfigRulesForGuild(guildId);
    return all.filter((r) => {
        if (r.commandName !== commandName)
            return false;
        if (roleId && r.roleId !== roleId)
            return false;
        return true;
    });
}
function mapVConfigRow(row) {
    return {
        id: row.id,
        guildId: row.guild_id,
        commandName: row.command_name,
        roleId: row.role_id,
        mode: row.mode,
        channelIds: row.channel_ids || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
//# sourceMappingURL=vconfigRepo.js.map
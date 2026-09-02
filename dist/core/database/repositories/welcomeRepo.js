import { getDb } from '../pool.js';
export async function getWelcomeConfig(guildId) {
    const db = getDb();
    const rows = await db `
    SELECT guild_id, greet_channel_id, greet_payload, greet_enabled, leave_channel_id, leave_payload, leave_enabled
    FROM welcome_configs WHERE guild_id = ${guildId}
  `;
    if (rows.length === 0)
        return null;
    return mapWelcomeRow(rows[0]);
}
export async function setGreetChannel(guildId, channelId) {
    const db = getDb();
    await db `
    INSERT INTO welcome_configs (guild_id, greet_channel_id)
    VALUES (${guildId}, ${channelId})
    ON CONFLICT (guild_id)
    DO UPDATE SET greet_channel_id = ${channelId}, updated_at = NOW()
  `;
}
export async function setGreetPayload(guildId, payload) {
    const db = getDb();
    await db `
    INSERT INTO welcome_configs (guild_id, greet_payload)
    VALUES (${guildId}, ${payload})
    ON CONFLICT (guild_id)
    DO UPDATE SET greet_payload = ${payload}, updated_at = NOW()
  `;
}
export async function removeGreetPayload(guildId) {
    const db = getDb();
    await db `
    UPDATE welcome_configs
    SET greet_payload = NULL, updated_at = NOW()
    WHERE guild_id = ${guildId}
  `;
}
export async function setLeaveChannel(guildId, channelId) {
    const db = getDb();
    await db `
    INSERT INTO welcome_configs (guild_id, leave_channel_id)
    VALUES (${guildId}, ${channelId})
    ON CONFLICT (guild_id)
    DO UPDATE SET leave_channel_id = ${channelId}, updated_at = NOW()
  `;
}
export async function setLeavePayload(guildId, payload) {
    const db = getDb();
    await db `
    INSERT INTO welcome_configs (guild_id, leave_payload)
    VALUES (${guildId}, ${payload})
    ON CONFLICT (guild_id)
    DO UPDATE SET leave_payload = ${payload}, updated_at = NOW()
  `;
}
export async function removeLeavePayload(guildId) {
    const db = getDb();
    await db `
    UPDATE welcome_configs
    SET leave_payload = NULL, updated_at = NOW()
    WHERE guild_id = ${guildId}
  `;
}
function mapWelcomeRow(row) {
    return {
        guildId: row.guild_id,
        greetChannelId: row.greet_channel_id ?? null,
        greetPayload: row.greet_payload ?? null,
        greetEnabled: row.greet_enabled !== undefined ? Boolean(row.greet_enabled) : Boolean(row.greet_channel_id),
        leaveChannelId: row.leave_channel_id ?? null,
        leavePayload: row.leave_payload ?? null,
        leaveEnabled: row.leave_enabled !== undefined ? Boolean(row.leave_enabled) : Boolean(row.leave_channel_id),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=welcomeRepo.js.map
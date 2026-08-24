import { getDb } from '../pool.js';
export async function setSticky(input) {
    const db = getDb();
    const rows = await db `
    INSERT INTO sticky_messages (guild_id, channel_id, message_id, content)
    VALUES (${input.guildId}, ${input.channelId}, ${input.messageId}, ${input.content})
    ON CONFLICT (guild_id, channel_id)
    DO UPDATE SET message_id = ${input.messageId}, content = ${input.content}, updated_at = NOW()
    RETURNING *
  `;
    activeStickyChannels.add(`${input.guildId}:${input.channelId}`);
    return mapStickyRow(rows[0]);
}
const activeStickyChannels = new Set();
let isStickyCacheLoaded = false;
export async function getSticky(guildId, channelId) {
    const db = getDb();
    if (!isStickyCacheLoaded) {
        const rows = await db `SELECT guild_id, channel_id FROM sticky_messages`;
        for (const row of rows)
            activeStickyChannels.add(`${row.guild_id}:${row.channel_id}`);
        isStickyCacheLoaded = true;
    }
    if (!activeStickyChannels.has(`${guildId}:${channelId}`))
        return null;
    const rows = await db `
    SELECT * FROM sticky_messages
    WHERE guild_id = ${guildId} AND channel_id = ${channelId}
  `;
    if (rows.length === 0)
        return null;
    return mapStickyRow(rows[0]);
}
export async function updateStickyMessageId(guildId, channelId, messageId) {
    const db = getDb();
    await db `
    UPDATE sticky_messages
    SET message_id = ${messageId}, updated_at = NOW()
    WHERE guild_id = ${guildId} AND channel_id = ${channelId}
  `;
}
export async function getStickiesForGuild(guildId) {
    const db = getDb();
    const rows = await db `
    SELECT * FROM sticky_messages
    WHERE guild_id = ${guildId}
    ORDER BY created_at ASC
  `;
    return rows.map(mapStickyRow);
}
export async function deleteSticky(guildId, channelId) {
    const db = getDb();
    const result = await db `
    DELETE FROM sticky_messages
    WHERE guild_id = ${guildId} AND channel_id = ${channelId}
  `;
    if (result.count > 0) {
        activeStickyChannels.delete(`${guildId}:${channelId}`);
    }
    return result.count > 0;
}
function mapStickyRow(row) {
    return {
        id: row.id,
        guildId: row.guild_id,
        channelId: row.channel_id,
        messageId: row.message_id,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=stickyRepo.js.map
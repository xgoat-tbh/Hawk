import { getDb } from '../pool.js';
import type { MediaChannelRecord } from '../../../types/media.js';

export async function addMediaChannel(guildId: string, channelId: string): Promise<boolean> {
  const db = getDb();
  const result = await db`
    INSERT INTO media_channels (guild_id, channel_id)
    VALUES (${guildId}, ${channelId})
    ON CONFLICT (guild_id, channel_id) DO NOTHING
    RETURNING id
  `;
  return result.length > 0;
}

export async function removeMediaChannel(guildId: string, channelId: string): Promise<boolean> {
  const db = getDb();
  const result = await db`
    DELETE FROM media_channels
    WHERE guild_id = ${guildId} AND channel_id = ${channelId}
  `;
  return result.count > 0;
}

export async function getMediaChannels(guildId: string): Promise<MediaChannelRecord[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM media_channels
    WHERE guild_id = ${guildId}
    ORDER BY created_at
  `;
  return rows.map(r => ({
    id: r.id as number,
    guildId: r.guild_id as string,
    channelId: r.channel_id as string,
    createdAt: r.created_at as Date,
  }));
}

export async function isMediaChannel(guildId: string, channelId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db`
    SELECT 1 FROM media_channels
    WHERE guild_id = ${guildId} AND channel_id = ${channelId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function setMediaAutoThread(guildId: string, enabled: boolean): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO media_guild_configs (guild_id, auto_thread)
    VALUES (${guildId}, ${enabled})
    ON CONFLICT (guild_id)
    DO UPDATE SET auto_thread = ${enabled}, updated_at = NOW()
  `;
}

export async function getMediaAutoThread(guildId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db`
    SELECT auto_thread FROM media_guild_configs
    WHERE guild_id = ${guildId}
  `;
  return rows[0]?.auto_thread ?? true;
}

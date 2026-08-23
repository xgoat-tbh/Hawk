import { getDb } from '../pool.js';
import type { ConfessionRecord } from '../../../types/confession.js';

export async function setConfessionChannel(guildId: string, channelId: string): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO confession_configs (guild_id, channel_id)
    VALUES (${guildId}, ${channelId})
    ON CONFLICT (guild_id)
    DO UPDATE SET channel_id = ${channelId}, updated_at = NOW()
  `;
}

export async function getConfessionChannel(guildId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db`SELECT channel_id FROM confession_configs WHERE guild_id = ${guildId}`;
  return rows[0]?.channel_id ?? null;
}

export async function setConfessionLogChannel(guildId: string, logChannelId: string | null): Promise<void> {
  const db = getDb();
  try {
    await db`
      INSERT INTO confession_configs (guild_id, channel_id, log_channel_id)
      VALUES (${guildId}, '', ${logChannelId})
      ON CONFLICT (guild_id)
      DO UPDATE SET log_channel_id = ${logChannelId}, updated_at = NOW()
    `;
  } catch {
    await db.unsafe('ALTER TABLE confession_configs ADD COLUMN IF NOT EXISTS log_channel_id TEXT;');
    await db`
      INSERT INTO confession_configs (guild_id, channel_id, log_channel_id)
      VALUES (${guildId}, '', ${logChannelId})
      ON CONFLICT (guild_id)
      DO UPDATE SET log_channel_id = ${logChannelId}, updated_at = NOW()
    `;
  }
}

export async function getConfessionLogChannel(guildId: string): Promise<string | null> {
  try {
    const db = getDb();
    const rows = await db`SELECT log_channel_id FROM confession_configs WHERE guild_id = ${guildId}`;
    return (rows[0]?.log_channel_id as string) ?? null;
  } catch {
    return null;
  }
}

export async function setConfessionPanelMessageId(guildId: string, messageId: string | null): Promise<void> {
  const db = getDb();
  await db`
    UPDATE confession_configs
    SET panel_message_id = ${messageId}, updated_at = NOW()
    WHERE guild_id = ${guildId}
  `;
}

export async function getConfessionConfig(guildId: string): Promise<{ channelId: string; panelMessageId: string | null; logChannelId: string | null } | null> {
  try {
    const db = getDb();
    const rows = await db`SELECT channel_id, panel_message_id, log_channel_id FROM confession_configs WHERE guild_id = ${guildId}`;
    if (rows.length === 0) return null;
    return {
      channelId: rows[0].channel_id as string,
      panelMessageId: (rows[0].panel_message_id as string) ?? null,
      logChannelId: (rows[0].log_channel_id as string) ?? null,
    };
  } catch {
    return null;
  }
}

export async function getAllConfessionConfigs(): Promise<{ guildId: string; channelId: string; panelMessageId: string | null; logChannelId: string | null }[]> {
  try {
    const db = getDb();
    const rows = await db`SELECT guild_id, channel_id, panel_message_id, log_channel_id FROM confession_configs`;
    return rows.map(r => ({
      guildId: r.guild_id as string,
      channelId: r.channel_id as string,
      panelMessageId: (r.panel_message_id as string) ?? null,
      logChannelId: (r.log_channel_id as string) ?? null,
    }));
  } catch {
    return [];
  }
}

export async function createConfessionRecord(
  guildId: string,
  authorId: string,
  content: string,
  channelId: string,
  messageId: string,
): Promise<ConfessionRecord> {
  const db = getDb();
  const rows = await db`
    INSERT INTO confession_records (guild_id, author_id, content, channel_id, message_id)
    VALUES (${guildId}, ${authorId}, ${content}, ${channelId}, ${messageId})
    RETURNING *
  `;
  const r = rows[0];
  return {
    id: r.id as number,
    guildId: r.guild_id as string,
    authorId: r.author_id as string,
    content: r.content as string,
    channelId: r.channel_id as string,
    messageId: r.message_id as string,
    createdAt: r.created_at as Date,
  };
}

export async function getConfessionRecordsForGuild(guildId: string): Promise<ConfessionRecord[]> {
  const db = getDb();
  const rows = await db`
    SELECT id, guild_id, author_id, content, channel_id, message_id, created_at
    FROM confession_records
    WHERE guild_id = ${guildId}
    ORDER BY id ASC
  `;
  return rows.map((r) => ({
    id: r.id as number,
    guildId: r.guild_id as string,
    authorId: r.author_id as string,
    content: r.content as string,
    channelId: r.channel_id as string,
    messageId: r.message_id as string,
    createdAt: r.created_at as Date,
  }));
}

export async function updateConfessionMessageId(id: number, messageId: string): Promise<void> {
  const db = getDb();
  await db`
    UPDATE confession_records
    SET message_id = ${messageId}
    WHERE id = ${id}
  `;
}

export async function resetConfessionDataForGuild(guildId: string): Promise<void> {
  const db = getDb();
  await db.begin(async (tx) => {
    await tx`DELETE FROM confession_records WHERE guild_id = ${guildId}`;
    await tx`DELETE FROM confession_configs WHERE guild_id = ${guildId}`;
  });
}


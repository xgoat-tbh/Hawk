import { getDb } from '../pool.js';
import type { GuildConfig } from '../../../types/config.js';
import { constants } from '../../config/constants.js';

const prefixCache = new Map<string, string>();

export async function getPrefix(guildId: string): Promise<string> {
  const cached = prefixCache.get(guildId);
  if (cached !== undefined) return cached;

  try {
    const db = getDb();
    const rows = await db`SELECT prefix FROM guild_config WHERE guild_id = ${guildId}`;
    const prefix = rows[0]?.prefix ?? constants.defaultPrefix;

    if (prefixCache.size >= 10000) {
      const firstKey = prefixCache.keys().next().value;
      if (firstKey !== undefined) prefixCache.delete(firstKey);
    }
    prefixCache.set(guildId, prefix);
    return prefix;
  } catch {
    return constants.defaultPrefix;
  }
}

export async function setPrefix(guildId: string, prefix: string): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO guild_config (guild_id, prefix)
    VALUES (${guildId}, ${prefix})
    ON CONFLICT (guild_id)
    DO UPDATE SET prefix = ${prefix}, updated_at = NOW()
  `;
  prefixCache.set(guildId, prefix);
}

export async function getGuildConfig(guildId: string): Promise<GuildConfig | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM guild_config WHERE guild_id = ${guildId}`;
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    guildId: row.guild_id as string,
    prefix: row.prefix as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export async function ensureGuildConfig(guildId: string): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO guild_config (guild_id)
    VALUES (${guildId})
    ON CONFLICT (guild_id) DO NOTHING
  `;
}

export function invalidatePrefixCache(guildId: string): void {
  prefixCache.delete(guildId);
}

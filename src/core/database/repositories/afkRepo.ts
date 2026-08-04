import { getDb } from '../pool.js';

export interface AfkRecord {
  guildId: string;
  userId: string;
  reason: string;
  startedAt: Date;
}

// In-memory cache for hot-path AFK checks in messageCreate: guildId -> userId -> AfkRecord
const afkCache = new Map<string, Map<string, { reason: string; startedAt: Date }>>();

export function getAfkCacheSize(): number {
  let count = 0;
  for (const guildMap of afkCache.values()) {
    count += guildMap.size;
  }
  return count;
}

export function getAfkEntriesForGuild(guildId: string): { userId: string; reason: string; startedAt: Date }[] {
  const guildMap = afkCache.get(guildId);
  if (!guildMap) return [];
  const entries: { userId: string; reason: string; startedAt: Date }[] = [];
  guildMap.forEach((val, userId) => {
    entries.push({ userId, reason: val.reason, startedAt: val.startedAt });
  });
  return entries;
}

export async function clearAllAfkRecords(guildId?: string): Promise<void> {
  if (guildId) {
    afkCache.delete(guildId);
  } else {
    afkCache.clear();
  }

  try {
    const db = getDb();
    if (guildId) {
      await db`DELETE FROM afk_users WHERE guild_id = ${guildId}`;
    } else {
      await db`TRUNCATE TABLE afk_users`;
    }
  } catch {
    // Ignore DB errors
  }
}

export async function loadAfkCache(): Promise<number> {
  afkCache.clear();
  try {
    const db = getDb();
    const rows = await db`SELECT guild_id, user_id, reason, started_at FROM afk_users`;
    for (const row of rows) {
      const guildId = row.guild_id as string;
      const userId = row.user_id as string;
      const reason = row.reason as string;
      const startedAt = new Date(row.started_at as Date);

      if (!afkCache.has(guildId)) {
        afkCache.set(guildId, new Map());
      }
      afkCache.get(guildId)!.set(userId, { reason, startedAt });
    }
    return rows.length;
  } catch {
    return 0;
  }
}

export async function setAfk(guildId: string, userId: string, reason: string): Promise<{ reason: string; startedAt: Date }> {
  const startedAt = new Date();

  try {
    const db = getDb();
    await db`
      INSERT INTO afk_users (guild_id, user_id, reason, started_at)
      VALUES (${guildId}, ${userId}, ${reason}, ${startedAt})
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET reason = ${reason}, started_at = ${startedAt}
    `;
  } catch {
    // Ignore DB errors if database is unavailable (e.g. offline testing)
  }

  if (!afkCache.has(guildId)) {
    afkCache.set(guildId, new Map());
  }
  afkCache.get(guildId)!.set(userId, { reason, startedAt });

  return { reason, startedAt };
}

export async function removeAfk(guildId: string, userId: string): Promise<{ reason: string; startedAt: Date } | null> {
  const guildMap = afkCache.get(guildId);
  const cached = guildMap?.get(userId) ?? null;

  guildMap?.delete(userId);
  if (guildMap && guildMap.size === 0) {
    afkCache.delete(guildId);
  }

  try {
    const db = getDb();
    const rows = await db`
      DELETE FROM afk_users
      WHERE guild_id = ${guildId} AND user_id = ${userId}
      RETURNING reason, started_at
    `;
    if (rows.length > 0) {
      return {
        reason: rows[0].reason as string,
        startedAt: new Date(rows[0].started_at as Date),
      };
    }
  } catch {
    // Ignore DB errors on remove
  }

  return cached;
}

export function getAfk(guildId: string, userId: string): { reason: string; startedAt: Date } | null {
  return afkCache.get(guildId)?.get(userId) ?? null;
}

export function isAfk(guildId: string, userId: string): boolean {
  return afkCache.get(guildId)?.has(userId) ?? false;
}

import { getDb } from '../pool.js';

const shipModeCache = new Map<string, 'global' | 'staff'>();

export async function getShipMode(guildId: string): Promise<'global' | 'staff'> {
  const cached = shipModeCache.get(guildId);
  if (cached) return cached;

  try {
    const db = getDb();
    const rows = await db`SELECT mode FROM ship_configs WHERE guild_id = ${guildId}`;
    const mode = (rows[0]?.mode as 'global' | 'staff') ?? 'global';
    shipModeCache.set(guildId, mode);
    return mode;
  } catch {
    return 'global';
  }
}

export async function setShipMode(guildId: string, mode: 'global' | 'staff'): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO ship_configs (guild_id, mode)
    VALUES (${guildId}, ${mode})
    ON CONFLICT (guild_id)
    DO UPDATE SET mode = ${mode}, updated_at = NOW()
  `;
  shipModeCache.set(guildId, mode);
}

export function invalidateShipModeCache(guildId: string): void {
  shipModeCache.delete(guildId);
}

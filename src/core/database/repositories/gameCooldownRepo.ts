import { getDb } from '../pool.js';

export async function getGameCooldown(guildId: string, gameName: string): Promise<number> {
  const db = getDb();
  const rows = await db`
    SELECT cooldown_seconds
    FROM game_cooldowns
    WHERE guild_id = ${guildId} AND game_name = ${gameName.toLowerCase()}
  `;

  return rows[0]?.cooldown_seconds ?? 15;
}

export async function setGameCooldown(
  guildId: string,
  gameName: string,
  seconds: number,
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO game_cooldowns (guild_id, game_name, cooldown_seconds, updated_at)
    VALUES (${guildId}, ${gameName.toLowerCase()}, ${seconds}, NOW())
    ON CONFLICT (guild_id, game_name)
    DO UPDATE SET
      cooldown_seconds = EXCLUDED.cooldown_seconds,
      updated_at = NOW()
  `;
}

export async function getAllGameCooldowns(guildId: string): Promise<Record<string, number>> {
  const db = getDb();
  const rows = await db`
    SELECT game_name, cooldown_seconds
    FROM game_cooldowns
    WHERE guild_id = ${guildId}
  `;

  const map: Record<string, number> = {
    coinflip: 15,
    mines: 15,
  };

  for (const r of rows) {
    map[r.game_name] = r.cooldown_seconds;
  }

  return map;
}

import { getDb } from '../pool.js';
import type { GamePingConfig, CreateGamePingInput, UpdateGamePingInput } from '../../../types/gaming.js';

export async function createGamePing(input: CreateGamePingInput): Promise<GamePingConfig> {
  const db = getDb();
  const lowerId = input.identifier.toLowerCase();
  const cooldown = input.cooldownSeconds ?? 300;

  const rows = await db`
    INSERT INTO game_pings (guild_id, identifier, game_name, role_id, vc_id, cooldown_seconds)
    VALUES (${input.guildId}, ${lowerId}, ${input.gameName}, ${input.roleId}, ${input.vcId}, ${cooldown})
    RETURNING id, guild_id, identifier, game_name, role_id, vc_id, cooldown_seconds, created_at, updated_at
  `;

  return mapPingRow(rows[0]);
}

export async function getGamePing(guildId: string, identifier: string): Promise<GamePingConfig | null> {
  const db = getDb();
  const lowerId = identifier.toLowerCase();

  const rows = await db`
    SELECT * FROM game_pings
    WHERE guild_id = ${guildId} AND identifier = ${lowerId}
  `;

  if (rows.length === 0) return null;
  return mapPingRow(rows[0]);
}

export async function updateGamePing(
  guildId: string,
  identifier: string,
  updates: UpdateGamePingInput,
): Promise<GamePingConfig | null> {
  const db = getDb();
  const lowerId = identifier.toLowerCase();

  const existing = await getGamePing(guildId, lowerId);
  if (!existing) return null;

  const newIdentifier = updates.newIdentifier ? updates.newIdentifier.toLowerCase() : existing.identifier;
  const newGameName = updates.gameName ?? existing.gameName;
  const newRoleId = updates.roleId ?? existing.roleId;
  const newVcId = updates.vcId ?? existing.vcId;
  const newCooldown = updates.cooldownSeconds ?? existing.cooldownSeconds;

  const rows = await db`
    UPDATE game_pings
    SET identifier = ${newIdentifier},
        game_name = ${newGameName},
        role_id = ${newRoleId},
        vc_id = ${newVcId},
        cooldown_seconds = ${newCooldown},
        updated_at = NOW()
    WHERE id = ${existing.id}
    RETURNING id, guild_id, identifier, game_name, role_id, vc_id, cooldown_seconds, created_at, updated_at
  `;

  if (rows.length === 0) return null;
  return mapPingRow(rows[0]);
}

export async function deleteGamePing(guildId: string, identifier: string): Promise<boolean> {
  const db = getDb();
  const lowerId = identifier.toLowerCase();

  const result = await db`
    DELETE FROM game_pings
    WHERE guild_id = ${guildId} AND identifier = ${lowerId}
  `;

  return result.count > 0;
}

export async function listGamePings(guildId: string): Promise<GamePingConfig[]> {
  const db = getDb();

  const rows = await db`
    SELECT * FROM game_pings
    WHERE guild_id = ${guildId}
    ORDER BY identifier ASC
  `;

  return rows.map(mapPingRow);
}

function mapPingRow(row: Record<string, unknown>): GamePingConfig {
  return {
    id: row.id as number,
    guildId: row.guild_id as string,
    identifier: row.identifier as string,
    gameName: row.game_name as string,
    roleId: row.role_id as string,
    vcId: row.vc_id as string,
    cooldownSeconds: row.cooldown_seconds as number,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

// Backward compatibility alias functions
export const getGame = getGamePing;
export const deleteGame = deleteGamePing;

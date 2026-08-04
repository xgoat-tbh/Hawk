import { getDb } from '../pool.js';
import type { PermitRecord } from '../../../types/permission.js';

const permitCache = new Map<string, PermitRecord[]>(); // guildId -> PermitRecord[]

export function invalidatePermitCache(guildId: string): void {
  permitCache.delete(guildId);
}

export async function getPermitsForGuild(guildId: string): Promise<PermitRecord[]> {
  const cached = permitCache.get(guildId);
  if (cached) return cached;

  try {
    const db = getDb();
    const rows = await db`SELECT * FROM permits WHERE guild_id = ${guildId}`;
    const mapped = rows.map(mapPermitRow);
    permitCache.set(guildId, mapped);
    return mapped;
  } catch {
    return [];
  }
}

export async function getPermits(
  guildId: string,
  commandName: string,
  moduleName: string,
): Promise<PermitRecord[]> {
  const permits = await getPermitsForGuild(guildId);
  return permits.filter((p) => {
    const matchCmd = p.commandName === commandName || p.commandName === null;
    const matchMod = p.moduleName === moduleName || p.moduleName === null;
    return matchCmd && matchMod;
  });
}

export async function hasPermit(
  guildId: string,
  userId: string,
  roleIds: string[],
  commandName: string,
  moduleName: string,
): Promise<boolean> {
  const permits = await getPermitsForGuild(guildId);
  return permits.some((p) => {
    const matchTarget = (p.targetType === 'user' && p.targetId === userId) ||
                        (p.targetType === 'role' && roleIds.includes(p.targetId));
    if (!matchTarget) return false;

    const matchCmd = (p.commandName === commandName && p.moduleName === moduleName) ||
                     (p.commandName === null && p.moduleName === moduleName) ||
                     (p.commandName === null && p.moduleName === null);
    return matchCmd;
  });
}

export async function addPermit(
  guildId: string,
  targetType: 'user' | 'role',
  targetId: string,
  commandName: string | null,
  moduleName: string | null,
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO permits (guild_id, target_type, target_id, command_name, module_name)
    VALUES (${guildId}, ${targetType}, ${targetId}, ${commandName}, ${moduleName})
    ON CONFLICT (guild_id, target_type, target_id, command_name, module_name) DO NOTHING
  `;
  invalidatePermitCache(guildId);
}

export async function removePermit(
  guildId: string,
  targetType: 'user' | 'role',
  targetId: string,
  commandName: string | null,
  moduleName: string | null,
): Promise<boolean> {
  const db = getDb();
  const result = await db`
    DELETE FROM permits
    WHERE guild_id = ${guildId}
      AND target_type = ${targetType}
      AND target_id = ${targetId}
      AND command_name IS NOT DISTINCT FROM ${commandName}
      AND module_name IS NOT DISTINCT FROM ${moduleName}
  `;
  invalidatePermitCache(guildId);
  return result.count > 0;
}

function mapPermitRow(row: Record<string, unknown>): PermitRecord {
  return {
    id: row.id as number,
    guildId: row.guild_id as string,
    targetType: row.target_type as 'user' | 'role',
    targetId: row.target_id as string,
    commandName: row.command_name as string | null,
    moduleName: row.module_name as string | null,
    createdAt: row.created_at as Date,
  };
}

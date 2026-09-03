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
  revokedById?: string,
  revokedByName?: string,
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
  if (result.count > 0 && revokedById && revokedByName) {
    await db`
      INSERT INTO permit_revocations (guild_id, target_type, target_id, command_name, module_name, revoked_by_id, revoked_by_name)
      VALUES (${guildId}, ${targetType}, ${targetId}, ${commandName}, ${moduleName}, ${revokedById}, ${revokedByName})
    `.catch(() => {});
  }
  invalidatePermitCache(guildId);
  return result.count > 0;
}

export async function deletePermitsByIds(guildId: string, ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const db = getDb();
  const result = await db`
    DELETE FROM permits
    WHERE guild_id = ${guildId}
      AND id = ANY(${ids})
  `;
  invalidatePermitCache(guildId);
  return result.count;
}

export async function removeAllPermitsForTarget(
  guildId: string,
  targetType: 'user' | 'role',
  targetId: string,
  revokedById?: string,
  revokedByName?: string,
): Promise<number> {
  const db = getDb();
  const result = await db`
    DELETE FROM permits
    WHERE guild_id = ${guildId}
      AND target_type = ${targetType}
      AND target_id = ${targetId}
  `;
  if (result.count > 0 && revokedById && revokedByName) {
    await db`
      INSERT INTO permit_revocations (guild_id, target_type, target_id, command_name, module_name, revoked_by_id, revoked_by_name)
      VALUES (${guildId}, ${targetType}, ${targetId}, 'ALL', 'ALL', ${revokedById}, ${revokedByName})
    `.catch(() => {});
  }
  invalidatePermitCache(guildId);
  return result.count;
}

export async function getLatestRevocation(
  guildId: string,
  userId: string,
  roleIds: string[],
  commandName: string,
  moduleName: string,
): Promise<{ revokedByName: string; revokedAt: Date } | null> {
  try {
    const db = getDb();
    const rows = await db`
      SELECT revoked_by_name, revoked_at
      FROM permit_revocations
      WHERE guild_id = ${guildId}
        AND (
          (target_type = 'user' AND target_id = ${userId})
          OR (target_type = 'role' AND target_id = ANY(${roleIds}))
        )
        AND (
          (command_name = ${commandName} AND module_name = ${moduleName})
          OR (command_name IS NULL AND module_name = ${moduleName})
          OR (command_name IS NULL AND module_name IS NULL)
        )
      ORDER BY revoked_at DESC
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    return {
      revokedByName: rows[0].revoked_by_name as string,
      revokedAt: new Date(rows[0].revoked_at as Date),
    };
  } catch {
    return null;
  }
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

export async function hasPolicyPermit(
  guildId: string,
  userId: string,
  roleIds: string[],
  moduleName: string,
): Promise<boolean> {
  try {
    const db = getDb();

    // 1. Check explicit user override
    const userOverride = await db`
      SELECT effect FROM user_overrides
      WHERE guild_id = ${guildId} AND user_id = ${userId} AND (module = ${moduleName} OR module = 'all')
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (userOverride.length > 0) {
      return userOverride[0].effect === 'ALLOW';
    }

    // 2. Check role policies if member has roles
    if (roleIds.length > 0) {
      const policies = await db`
        SELECT profile_id FROM role_policies
        WHERE guild_id = ${guildId} AND role_id = ANY(${roleIds}) AND status = 'active'
      `;
      for (const p of policies) {
        const profId = (String(p.profile_id || '')).toLowerCase();
        if (profId === 'administrator') return true;
        if (profId === 'moderator' && ['moderation', 'sticky', 'media', 'community', 'suggestion', 'confession'].includes(moduleName)) return true;
        if (profId === 'economy_manager' && ['economy', 'store', 'income'].includes(moduleName)) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

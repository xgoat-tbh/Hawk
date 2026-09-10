import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { fetchGuildDetails, fetchGuildMember, fetchGuildRoles } from './discord';

export const COOKIE_NAME = 'hawk_session';

export interface UserSession {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  isBotAdmin?: boolean;
  isBotOwner?: boolean;
}

let authSchemaEnsured = false;
export async function ensureAuthTables(): Promise<void> {
  if (authSchemaEnsured) return;
  try {
    await db`
      CREATE TABLE IF NOT EXISTS dashboard_sessions (
        token VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(32) NOT NULL,
        username VARCHAR(64) NOT NULL,
        discriminator VARCHAR(8) NOT NULL DEFAULT '0',
        avatar TEXT,
        is_bot_owner BOOLEAN NOT NULL DEFAULT FALSE,
        is_bot_admin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS dashboard_otps (
        user_id VARCHAR(32) PRIMARY KEY,
        otp_code VARCHAR(8) NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        locked_until TIMESTAMPTZ
      )
    `;
    authSchemaEnsured = true;
  } catch (err) {
    console.warn('Could not auto-ensure auth tables:', err);
  }
}

/**
 * Creates a server-side session in PostgreSQL with a cryptographically random 64-char token.
 * Defaults to 24-hour expiration.
 */
export async function createSession(payload: UserSession, durationHours = 24): Promise<string> {
  await ensureAuthTables();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  await db`
    INSERT INTO dashboard_sessions (
      token, user_id, username, discriminator, avatar, is_bot_owner, is_bot_admin, expires_at
    ) VALUES (
      ${token},
      ${payload.id},
      ${payload.username},
      ${payload.discriminator || '0'},
      ${payload.avatar || null},
      ${Boolean(payload.isBotOwner)},
      ${Boolean(payload.isBotAdmin)},
      ${expiresAt}
    )
  `;

  return token;
}

/**
 * Validates session from cookie against PostgreSQL dashboard_sessions table.
 */
export async function getSession(): Promise<UserSession | null> {
  await ensureAuthTables();
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || typeof token !== 'string' || token.length !== 64) {
    return null;
  }

  try {
    const rows = await db`
      SELECT user_id, username, discriminator, avatar, is_bot_owner, is_bot_admin, expires_at
      FROM dashboard_sessions
      WHERE token = ${token}
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.user_id,
      username: row.username,
      discriminator: row.discriminator,
      avatar: row.avatar,
      isBotOwner: row.is_bot_owner,
      isBotAdmin: row.is_bot_admin,
    };
  } catch (err) {
    console.error('Error querying dashboard_sessions:', err);
    return null;
  }
}

/**
 * Destroys a session token in PostgreSQL.
 */
export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  try {
    await db`DELETE FROM dashboard_sessions WHERE token = ${token}`;
  } catch (err) {
    console.error('Error deleting session:', err);
  }
}


export function isBotOwner(userId: string): boolean {
  const cleanId = userId.trim();
  const ownerEnv = process.env.BOT_OWNER_ID || process.env.BOT_OWNER_IDS || '';
  const ownerIds = ownerEnv.split(',').map((id) => id.trim()).filter(Boolean);
  return ownerIds.includes(cleanId);
}

export function isBotAdmin(userId: string): boolean {
  if (isBotOwner(userId)) return true;
  const cleanId = userId.trim();
  const adminEnv = process.env.BOT_ADMIN_IDS || '';
  const adminIds = adminEnv.split(',').map((id) => id.trim()).filter(Boolean);
  return adminIds.includes(cleanId);
}

export async function isAuthorizedUser(userId: string): Promise<boolean> {
  const cleanId = userId.trim();
  if (isBotOwner(cleanId) || isBotAdmin(cleanId)) return true;

  // Check dashboard_access table in PostgreSQL database
  try {
    const rows = await db`
      SELECT 1 FROM dashboard_access WHERE user_id = ${cleanId} LIMIT 1
    `;
    if (rows.length > 0) return true;
  } catch (err) {
    console.warn('Error checking dashboard_access DB:', err);
  }

  return false;
}

// In-memory cache for guild authorization checks (30s) with max-size eviction
const MAX_AUTH_CACHE_SIZE = 500;
const guildAuthCache = new Map<string, { authorized: boolean; timestamp: number }>();

function setGuildAuthCache(key: string, authorized: boolean): void {
  if (guildAuthCache.size >= MAX_AUTH_CACHE_SIZE) {
    const firstKey = guildAuthCache.keys().next().value;
    if (firstKey) guildAuthCache.delete(firstKey);
  }
  guildAuthCache.set(key, { authorized, timestamp: Date.now() });
}

export async function isGuildOwner(userId: string, guildId: string): Promise<boolean> {
  const cleanUserId = userId.trim();
  const cleanGuildId = guildId.trim();
  if (isBotOwner(cleanUserId)) return true;
  try {
    const guild = await fetchGuildDetails(cleanGuildId);
    return Boolean(guild && guild.owner_id === cleanUserId);
  } catch {
    return false;
  }
}

export async function canManageGuild(userId: string, guildId: string): Promise<boolean> {
  const cleanUserId = userId.trim();
  const cleanGuildId = guildId.trim();

  // 1. Bot owner / bot admin / global access
  if (await isAuthorizedUser(cleanUserId)) {
    return true;
  }

  const cacheKey = `${cleanGuildId}:${cleanUserId}`;
  const cached = guildAuthCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 30_000) {
    return cached.authorized;
  }

  try {
    // 2. Check if user is the guild owner in Discord
    const guild = await fetchGuildDetails(cleanGuildId);
    if (guild && guild.owner_id === cleanUserId) {
      setGuildAuthCache(cacheKey, true);
      return true;
    }

    // 3. Check guild member permissions
    const member = await fetchGuildMember(cleanGuildId, cleanUserId);
    if (member) {
      const ADMINISTRATOR = 0x8n;
      const MANAGE_GUILD = 0x20n;

      // Direct member permissions bitfield check
      if (member.permissions) {
        const perms = BigInt(member.permissions);
        if ((perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD) {
          setGuildAuthCache(cacheKey, true);
          return true;
        }
      }

      // Role-based permissions check using Discord permission bitfields
      if (member.roles && member.roles.length > 0) {
        const roles = await fetchGuildRoles(cleanGuildId);
        const memberRoleIds = new Set(member.roles);
        for (const role of roles) {
          if (memberRoleIds.has(role.id) && role.permissions) {
            const rolePerms = BigInt(role.permissions);
            if ((rolePerms & ADMINISTRATOR) === ADMINISTRATOR || (rolePerms & MANAGE_GUILD) === MANAGE_GUILD) {
              setGuildAuthCache(cacheKey, true);
              return true;
            }
          }
        }
      }
    }

    // 4. Check user_overrides in PostgreSQL database
    const overrides = await db`
      SELECT 1 FROM user_overrides
      WHERE guild_id = ${cleanGuildId}
        AND user_id = ${cleanUserId}
        AND effect = 'ALLOW'
      LIMIT 1
    `;
    if (overrides.length > 0) {
      setGuildAuthCache(cacheKey, true);
      return true;
    }
  } catch (error) {
    console.error(`Error checking guild authorization for user ${cleanUserId} on ${cleanGuildId}:`, error);
  }

  setGuildAuthCache(cacheKey, false);
  return false;
}

export async function getUserModulePermissions(userId: string, guildId: string): Promise<{
  isOwner: boolean;
  isAdmin: boolean;
  modules: Record<string, { view: boolean; manage: boolean }>;
}> {
  const cleanUserId = userId.trim();
  const cleanGuildId = guildId.trim();
  const isOwner = await isGuildOwner(cleanUserId, cleanGuildId);
  const isGlobalAdmin = await isAuthorizedUser(cleanUserId);

  const allModulesList = ['general', 'economy', 'pvc', 'gaming', 'media', 'sticky', 'permissions', 'community'];

  if (isOwner || isGlobalAdmin) {
    const modules: Record<string, { view: boolean; manage: boolean }> = {};
    for (const m of allModulesList) {
      modules[m] = { view: true, manage: true };
    }
    return { isOwner: true, isAdmin: true, modules };
  }

  // Check Discord admin
  let isDiscordAdmin = false;
  try {
    const member = await fetchGuildMember(cleanGuildId, cleanUserId);
    if (member?.permissions) {
      const perms = BigInt(member.permissions);
      if ((perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n) isDiscordAdmin = true;
    }
  } catch (error) {
    console.debug('Could not fetch guild member permissions:', error);
  }

  // Fetch overrides
  let userOverrides: { module: string; action: string; effect: string }[] = [];
  try {
    userOverrides = await db`
      SELECT module, action, effect FROM user_overrides
      WHERE guild_id = ${cleanGuildId} AND user_id = ${cleanUserId}
    `;
  } catch (error) {
    console.debug('Could not fetch user_overrides:', error);
  }

  const modules: Record<string, { view: boolean; manage: boolean }> = {};

  for (const m of allModulesList) {
    if (userOverrides.length > 0) {
      const viewOv = userOverrides.find((o) => o.module === m && o.action === 'view');
      const manageOv = userOverrides.find((o) => o.module === m && o.action === 'manage');
      const canManage = manageOv?.effect === 'ALLOW';
      const canView = canManage || viewOv?.effect === 'ALLOW';
      modules[m] = { view: canView, manage: canManage };
    } else {
      // Default to discord admin access if no explicit overrides
      modules[m] = { view: isDiscordAdmin, manage: isDiscordAdmin };
    }
  }

  return { isOwner, isAdmin: isDiscordAdmin, modules };
}

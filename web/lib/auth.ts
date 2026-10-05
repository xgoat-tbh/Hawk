import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { fetchGuildDetails, fetchGuildMember, fetchGuildRoles, fetchBotGuilds } from './discord';
import { supportedGuildIds } from './guilds';

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
export async function createSession(payload: UserSession, durationHours = sessionDurationHours()): Promise<string> {
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
  const cookieStore = await cookies();
  return getSessionFromToken(cookieStore.get(COOKIE_NAME)?.value || '');
}

export function sessionDurationHours(): number {
  const value = Number(process.env.SESSION_DURATION_HOURS || 24);
  return Number.isFinite(value) ? Math.max(1, Math.min(168, value)) : 24;
}

export async function getSessionFromToken(token: string): Promise<UserSession | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  await ensureAuthTables();
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
      isBotOwner: isBotOwner(row.user_id),
      isBotAdmin: isBotAdmin(row.user_id),
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
  await db`DELETE FROM dashboard_sessions WHERE token = ${token}`;
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

async function hasDiscordViewAccess(userId: string, guildId: string): Promise<boolean> {
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
        const memberRoleIds = new Set([cleanGuildId, ...member.roles]);
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

  } catch (error) {
    console.error(`Error checking guild authorization for user ${cleanUserId} on ${cleanGuildId}:`, error);
  }

  setGuildAuthCache(cacheKey, false);
  return false;
}

export type AccessLevel = 'owner' | 'admin' | 'editor' | 'viewer' | 'none';
export async function getAccessLevel(userId: string, guildId: string): Promise<AccessLevel> {
  if (!supportedGuildIds.includes(guildId)) return 'none';
  if (isBotOwner(userId)) return 'owner';
  if (isBotAdmin(userId)) return 'admin';
  if (await isAuthorizedUser(userId)) return 'editor';
  return await hasDiscordViewAccess(userId, guildId) ? 'viewer' : 'none';
}
export async function canManageGuild(userId: string, guildId: string) {
  return ['owner', 'admin', 'editor'].includes(await getAccessLevel(userId, guildId));
}
export async function canViewGuild(userId: string, guildId: string) {
  return (await getAccessLevel(userId, guildId)) !== 'none';
}
export async function canLogin(userId: string) {
  if (await isAuthorizedUser(userId)) return true;
  const guilds = await fetchBotGuilds();
  return (await Promise.all(guilds.filter(g => supportedGuildIds.includes(g.id)).map(g => canViewGuild(userId, g.id)))).some(Boolean);
}
export async function getUserModulePermissions(userId: string, guildId: string) {
  const level = await getAccessLevel(userId, guildId);
  const manage = ['owner', 'admin', 'editor'].includes(level);
  const names = ['general', 'welcome', 'economy', 'income', 'store', 'games', 'pvc', 'gaming', 'sticky', 'permissions', 'community', 'developers', 'commands'];
  const modules = Object.fromEntries(names.map(name => [name, { view: level !== 'none', manage }]));
  return { isOwner: level === 'owner', isAdmin: level === 'admin', accessLevel: level, modules };
}

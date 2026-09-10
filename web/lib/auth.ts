import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from './db';
import { fetchGuildDetails, fetchGuildMember, fetchGuildRoles } from './discord';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.BOT_TOKEN;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: Neither JWT_SECRET nor BOT_TOKEN is configured in production environment.');
    }
    return 'hawk-dev-secret-unsafe-for-prod';
  }
  return secret;
}

export const COOKIE_NAME = 'hawk_session';

export interface UserSession {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  isBotAdmin?: boolean;
  isBotOwner?: boolean;
}

export function createToken(payload: UserSession): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, getJwtSecret()) as UserSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
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

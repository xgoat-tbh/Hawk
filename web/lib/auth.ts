import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { fetchGuildDetails, fetchGuildMember, fetchGuildRoles } from './discord';

// Ensure a strong random secret if none is configured in environment
const globalAuth = globalThis as unknown as { __hawk_jwt_secret?: string };
if (!process.env.JWT_SECRET && !globalAuth.__hawk_jwt_secret) {
  globalAuth.__hawk_jwt_secret = crypto.randomBytes(48).toString('hex');
}

const JWT_SECRET = process.env.JWT_SECRET || globalAuth.__hawk_jwt_secret || 'hawk-production-secret-override';
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
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

// In-memory cache for guild authorization checks (30s)
const guildAuthCache = new Map<string, { authorized: boolean; timestamp: number }>();

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
      guildAuthCache.set(cacheKey, { authorized: true, timestamp: Date.now() });
      return true;
    }

    // 3. Check guild member permissions
    const member = await fetchGuildMember(cleanGuildId, cleanUserId);
    if (member) {
      // Direct member permissions bitfield check
      if (member.permissions) {
        const perms = BigInt(member.permissions);
        const ADMINISTRATOR = 0x8n;
        const MANAGE_GUILD = 0x20n;
        if ((perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD) {
          guildAuthCache.set(cacheKey, { authorized: true, timestamp: Date.now() });
          return true;
        }
      }

      // Role-based permissions check
      if (member.roles && member.roles.length > 0) {
        const roles = await fetchGuildRoles(cleanGuildId);
        const memberRoleIds = new Set(member.roles);
        for (const role of roles) {
          if (memberRoleIds.has(role.id)) {
            if (role.name.toLowerCase().includes('admin') || role.name.toLowerCase().includes('owner')) {
              guildAuthCache.set(cacheKey, { authorized: true, timestamp: Date.now() });
              return true;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error checking guild authorization for user ${cleanUserId} on ${cleanGuildId}:`, error);
  }

  guildAuthCache.set(cacheKey, { authorized: false, timestamp: Date.now() });
  return false;
}

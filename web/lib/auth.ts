import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'hawk-super-secure-secret-jwt-key-2026';
const COOKIE_NAME = 'hawk_session';

export interface UserSession {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
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

export async function isAuthorizedUser(userId: string): Promise<boolean> {
  const cleanId = userId.trim();

  // 1. Check BOT_OWNER_ID env
  const ownerEnv = process.env.BOT_OWNER_ID || process.env.BOT_OWNER_IDS || '';
  const ownerIds = ownerEnv.split(',').map((id) => id.trim()).filter(Boolean);
  if (ownerIds.includes(cleanId)) return true;

  // 2. Check BOT_ADMIN_IDS env
  const adminEnv = process.env.BOT_ADMIN_IDS || '';
  const adminIds = adminEnv.split(',').map((id) => id.trim()).filter(Boolean);
  if (adminIds.includes(cleanId)) return true;

  // 3. Check dashboard_access table in DB
  try {
    const rows = await db`
      SELECT 1 FROM dashboard_access WHERE user_id = ${cleanId} LIMIT 1
    `;
    if (rows.length > 0) return true;
  } catch (err) {
    console.error('Error checking dashboard_access DB:', err);
  }

  return false;
}

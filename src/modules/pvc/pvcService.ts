import { getDb } from '../../core/database/pool.js';
import { ensureBalance } from '../economy/economyService.js';
import { withPvcOwnerLock } from './pvcLocks.js';


export interface PvcSession {
  channelId: string;
  guildId: string;
  ownerId: string;
  expiresAt: Date;
  autoPayEnabled: boolean;
  isLocked: boolean;
  isHidden: boolean;
  userLimit: number;
  roomName?: string | null;
  bitrate?: number | null;
}

export interface PvcAccessEntry {
  channelId: string;
  targetId: string;
  targetType: 'USER' | 'ROLE';
  access: 'ALLOW' | 'DENY';
}

function mapSessionRow(row: Record<string, any>): PvcSession {
  return {
    channelId: row.channel_id,
    guildId: row.guild_id,
    ownerId: row.owner_id,
    expiresAt: row.expires_at,
    autoPayEnabled: row.auto_pay_enabled,
    isLocked: row.is_locked,
    isHidden: row.is_hidden,
    userLimit: row.user_limit,
    roomName: row.room_name,
    bitrate: row.bitrate,
  };
}

function mapAccessRow(row: Record<string, any>): PvcAccessEntry {
  return {
    channelId: row.channel_id,
    targetId: row.target_id,
    targetType: row.target_type,
    access: row.access,
  };
}

export async function createSession(
  channelId: string,
  guildId: string,
  ownerId: string,
  hours: number
): Promise<PvcSession> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const rows = await db`
    INSERT INTO pvc_sessions (channel_id, guild_id, owner_id, expires_at)
    VALUES (${channelId}, ${guildId}, ${ownerId}, ${expiresAt})
    RETURNING *
  `;
  return mapSessionRow(rows[0]);
}

export async function getSession(channelId: string): Promise<PvcSession | null> {
  const db = getDb();
  const rows = await db`SELECT * FROM pvc_sessions WHERE channel_id = ${channelId}`;
  if (!rows.length) return null;
  return mapSessionRow(rows[0]);
}

export async function getSessionByOwner(guildId: string, ownerId: string): Promise<PvcSession | null> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM pvc_sessions
    WHERE guild_id = ${guildId} AND owner_id = ${ownerId}
  `;
  if (!rows.length) return null;
  return mapSessionRow(rows[0]);
}

export async function extendSession(channelId: string, minutes: number): Promise<void> {
  const db = getDb();
  await db`
    UPDATE pvc_sessions
    SET expires_at = expires_at + (${minutes} * interval '1 minute')
    WHERE channel_id = ${channelId}
  `;
}

export async function deleteSession(channelId: string): Promise<void> {
  const db = getDb();
  await db`DELETE FROM pvc_sessions WHERE channel_id = ${channelId}`;
}

export async function setAutoPayEnabled(channelId: string, enabled: boolean): Promise<void> {
  const db = getDb();
  await db`UPDATE pvc_sessions SET auto_pay_enabled = ${enabled} WHERE channel_id = ${channelId}`;
}

export async function setLocked(channelId: string, locked: boolean): Promise<void> {
  const db = getDb();
  await db`UPDATE pvc_sessions SET is_locked = ${locked} WHERE channel_id = ${channelId}`;
}

export async function setHidden(channelId: string, hidden: boolean): Promise<void> {
  const db = getDb();
  await db`UPDATE pvc_sessions SET is_hidden = ${hidden} WHERE channel_id = ${channelId}`;
}

export async function setUserLimit(channelId: string, limit: number): Promise<void> {
  const db = getDb();
  await db`UPDATE pvc_sessions SET user_limit = ${limit} WHERE channel_id = ${channelId}`;
}

export async function transferOwnership(channelId: string, newOwnerId: string): Promise<void> {
  const db = getDb();
  await db`UPDATE pvc_sessions SET owner_id = ${newOwnerId} WHERE channel_id = ${channelId}`;
}

export async function addAccess(
  channelId: string,
  targetId: string,
  targetType: 'USER' | 'ROLE',
  access: 'ALLOW' | 'DENY'
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO pvc_access (channel_id, target_id, target_type, access)
    VALUES (${channelId}, ${targetId}, ${targetType}, ${access})
    ON CONFLICT (channel_id, target_id)
    DO UPDATE SET access = ${access}
  `;
}

export async function removeAccess(channelId: string, targetId: string): Promise<void> {
  const db = getDb();
  await db`DELETE FROM pvc_access WHERE channel_id = ${channelId} AND target_id = ${targetId}`;
}

export async function getAccessList(channelId: string): Promise<PvcAccessEntry[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM pvc_access WHERE channel_id = ${channelId}`;
  return rows.map(mapAccessRow);
}

export async function getExpiringSessionsForAutoPay(thresholdMinutes: number): Promise<PvcSession[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM pvc_sessions
    WHERE auto_pay_enabled = true
    AND expires_at <= NOW() + (${thresholdMinutes} * interval '1 minute')
  `;
  return rows.map(mapSessionRow);
}

export async function getExpiredSessions(): Promise<PvcSession[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM pvc_sessions WHERE expires_at <= NOW()`;
  return rows.map(mapSessionRow);
}

export async function getSessionsExpiringWithin(minutes: number): Promise<PvcSession[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM pvc_sessions
    WHERE expires_at <= NOW() + (${minutes} * interval '1 minute')
  `;
  return rows.map(mapSessionRow);
}

export async function buyPvcTime(
  guildId: string,
  userId: string,
  hours: number,
  hourlyRate: number
): Promise<{ channelId?: string; extended: boolean }> {
  return withPvcOwnerLock(guildId, userId, async () => {
    const existing = await getSessionByOwner(guildId, userId);
    const session = await reservePvcTime(guildId, userId, hours, hourlyRate);
    return { channelId: session.channelId, extended: !!existing };
  });
}

/** Commit payment and rental credit together before making any Discord requests. */
export async function reservePvcTime(guildId: string, userId: string, hours: number, hourlyRate: number): Promise<PvcSession> {
  if (!Number.isInteger(hours) || hours <= 0 || hours > 720 || !Number.isFinite(hourlyRate) || hourlyRate < 0) throw new Error('Invalid PVC purchase');
  const db = getDb();
  const totalCost = hours * hourlyRate;
  
  await ensureBalance(guildId, userId);
  
  return db.begin(async tx => {
    const balances = await tx`SELECT cash, bank FROM economy_balances WHERE guild_id = ${guildId} AND user_id = ${userId} FOR UPDATE`;
    if (!balances.length || Number(balances[0].cash) + Number(balances[0].bank) < totalCost) throw new Error('Insufficient funds');
    const fromCash = Math.min(Number(balances[0].cash), totalCost);
    await tx`UPDATE economy_balances SET cash = cash - ${fromCash}, bank = bank - ${totalCost - fromCash}, updated_at = NOW() WHERE guild_id = ${guildId} AND user_id = ${userId}`;
    const existing = await tx`SELECT * FROM pvc_sessions WHERE guild_id = ${guildId} AND owner_id = ${userId} FOR UPDATE`;
    if (existing.length) {
      const rows = await tx`UPDATE pvc_sessions SET expires_at = GREATEST(expires_at, NOW()) + (${hours} * interval '1 hour') WHERE channel_id = ${existing[0].channel_id} RETURNING *`;
      return mapSessionRow(rows[0]);
    }
    const pendingChannelId = `pending-${guildId}-${userId}`;
    const rows = await tx`INSERT INTO pvc_sessions (channel_id, guild_id, owner_id, expires_at) VALUES (${pendingChannelId}, ${guildId}, ${userId}, NOW() + (${hours} * interval '1 hour')) RETURNING *`;
    return mapSessionRow(rows[0]);
  });
}

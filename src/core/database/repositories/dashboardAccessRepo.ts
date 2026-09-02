import { getDb } from '../pool.js';

export interface DashboardAccessEntry {
  userId: string;
  grantedBy: string;
  grantedAt: Date;
  notes?: string | null;
}

export async function hasDashboardAccess(userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db`
    SELECT 1 FROM dashboard_access WHERE user_id = ${userId} LIMIT 1
  `;
  return rows.length > 0;
}

export async function grantDashboardAccess(userId: string, grantedBy: string, notes?: string): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO dashboard_access (user_id, granted_by, notes)
    VALUES (${userId}, ${grantedBy}, ${notes || null})
    ON CONFLICT (user_id) DO UPDATE SET
      granted_by = EXCLUDED.granted_by,
      granted_at = NOW(),
      notes = EXCLUDED.notes
  `;
}

export async function revokeDashboardAccess(userId: string): Promise<boolean> {
  const db = getDb();
  const res = await db`
    DELETE FROM dashboard_access WHERE user_id = ${userId}
  `;
  return res.count > 0;
}

export async function listDashboardAccess(): Promise<DashboardAccessEntry[]> {
  const db = getDb();
  const rows = await db`
    SELECT user_id, granted_by, granted_at, notes
    FROM dashboard_access
    ORDER BY granted_at DESC
  `;
  return rows.map((r: any) => ({
    userId: r.user_id,
    grantedBy: r.granted_by,
    grantedAt: r.granted_at,
    notes: r.notes,
  }));
}

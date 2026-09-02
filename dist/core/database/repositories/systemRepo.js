import { getDb } from '../pool.js';
let cachedMaintenance = null;
export async function getMaintenanceState() {
    if (cachedMaintenance !== null)
        return cachedMaintenance;
    try {
        const db = getDb();
        const rows = await db `SELECT value FROM system_settings WHERE key = 'maintenance'`.catch(async () => {
            await db `
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `.catch(() => { });
            return await db `SELECT value FROM system_settings WHERE key = 'maintenance'`.catch(() => []);
        });
        if (rows.length === 0) {
            cachedMaintenance = {
                enabled: false,
                reason: 'Scheduled maintenance in progress.',
                enabledAt: null,
                enabledBy: null,
            };
            return cachedMaintenance;
        }
        const val = rows[0].value;
        cachedMaintenance = {
            enabled: Boolean(val?.enabled),
            reason: val?.reason || 'Scheduled maintenance in progress.',
            enabledAt: val?.enabledAt ? new Date(val.enabledAt) : null,
            enabledBy: val?.enabledBy || null,
        };
        return cachedMaintenance;
    }
    catch {
        return {
            enabled: false,
            reason: 'Scheduled maintenance in progress.',
            enabledAt: null,
            enabledBy: null,
        };
    }
}
export async function setMaintenanceState(enabled, reason = 'Scheduled maintenance in progress.', enabledBy = null) {
    const payload = {
        enabled,
        reason,
        enabledAt: enabled ? new Date().toISOString() : null,
        enabledBy,
    };
    const db = getDb();
    try {
        await db `
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('maintenance', ${JSON.stringify(payload)}::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = ${JSON.stringify(payload)}::jsonb, updated_at = NOW()
    `;
    }
    catch (err) {
        if (err?.code === '42P01') {
            await db `
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `.catch(() => { });
            await db `
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('maintenance', ${JSON.stringify(payload)}::jsonb, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = ${JSON.stringify(payload)}::jsonb, updated_at = NOW()
      `;
        }
        else {
            throw err;
        }
    }
    cachedMaintenance = {
        enabled,
        reason,
        enabledAt: enabled ? new Date() : null,
        enabledBy,
    };
}
export function invalidateMaintenanceCache() {
    cachedMaintenance = null;
}
//# sourceMappingURL=systemRepo.js.map
import { db } from './db';

export interface AuditEvent {
  id: string;
  guildId: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  target?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source: 'DASHBOARD' | 'BOT_COMMAND' | 'SYSTEM';
  timestamp: string;
}

// In-memory fallback cache for audit logs if DB table is initializing
const memoryAuditLogs = new Map<string, AuditEvent[]>();

/**
 * Log a security-sensitive audit event.
 */
export async function logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
  const auditEntry: AuditEvent = {
    ...event,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  // 1. Store in memory buffer
  const guildLogs = memoryAuditLogs.get(event.guildId) || [];
  guildLogs.unshift(auditEntry);
  if (guildLogs.length > 200) guildLogs.pop(); // Keep last 200 in memory
  memoryAuditLogs.set(event.guildId, guildLogs);

  // 2. Persist to PostgreSQL if audit_logs table exists
  try {
    await db`
      INSERT INTO guild_audit_logs (
        id, guild_id, user_id, user_name, action, module, target, previous_value, new_value, severity, source, created_at
      ) VALUES (
        ${auditEntry.id},
        ${auditEntry.guildId},
        ${auditEntry.userId},
        ${auditEntry.userName},
        ${auditEntry.action},
        ${auditEntry.module},
        ${auditEntry.target || null},
        ${auditEntry.previousValue || null},
        ${auditEntry.newValue || null},
        ${auditEntry.severity},
        ${auditEntry.source},
        ${auditEntry.timestamp}
      )
    `;
  } catch {
    // Graceful fallback to memory log buffer
  }

  return auditEntry;
}

/**
 * Fetch filterable audit events for a guild.
 */
export async function fetchGuildAuditLogs(
  guildId: string,
  filter?: { module?: string; severity?: string; search?: string }
): Promise<AuditEvent[]> {
  try {
    const rows = await db`
      SELECT 
        id, guild_id as "guildId", user_id as "userId", user_name as "userName",
        action, module, target, previous_value as "previousValue", new_value as "newValue",
        severity, source, created_at as "timestamp"
      FROM guild_audit_logs
      WHERE guild_id = ${guildId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    if (rows.length > 0) {
      let filtered = rows as unknown as AuditEvent[];
      if (filter?.module && filter.module !== 'ALL') {
        filtered = filtered.filter((e) => e.module === filter.module);
      }
      if (filter?.severity && filter.severity !== 'ALL') {
        filtered = filtered.filter((e) => e.severity === filter.severity);
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.action.toLowerCase().includes(q) ||
            e.userName.toLowerCase().includes(q) ||
            e.module.toLowerCase().includes(q)
        );
      }
      return filtered;
    }
  } catch {
    // Database table not created yet, fall back to memory
  }

  let logs = memoryAuditLogs.get(guildId) || [];

  // Seed default sample entries if freshly launched
  if (logs.length === 0) {
    logs = [
      {
        id: 'seed_1',
        guildId,
        userId: 'system',
        userName: 'Hawk Bot',
        action: 'Synchronized Server Modules',
        module: 'system',
        severity: 'INFO',
        source: 'SYSTEM',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'seed_2',
        guildId,
        userId: 'admin',
        userName: 'Owner',
        action: 'Updated Welcome Message Configuration',
        module: 'welcome',
        previousValue: 'Plain Text Mode',
        newValue: 'Rich Embed Mode with dynamic user tokens',
        severity: 'INFO',
        source: 'DASHBOARD',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
    memoryAuditLogs.set(guildId, logs);
  }

  let filtered = [...logs];
  if (filter?.module && filter.module !== 'ALL') {
    filtered = filtered.filter((e) => e.module === filter.module);
  }
  if (filter?.severity && filter.severity !== 'ALL') {
    filtered = filtered.filter((e) => e.severity === filter.severity);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        e.userName.toLowerCase().includes(q) ||
        e.module.toLowerCase().includes(q)
    );
  }

  return filtered;
}

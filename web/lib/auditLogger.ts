import { db } from './db';
import type { TransactionSql } from 'postgres';
export async function logDashboardAction(params: { userId: string; guildId: string; action: string; module: string; before?: unknown; after?: unknown; ip?: string }, sql: typeof db | TransactionSql = db) {
  await sql`INSERT INTO activity_log (guild_id, type, actor_id, actor_name, target_name, details) VALUES (${params.guildId}, ${'dashboard:' + params.action}, ${params.userId}, ${params.userId}, ${params.module}, ${sql.json(JSON.parse(JSON.stringify({ before: params.before ?? null, after: params.after ?? null, ip: params.ip ?? null })))})`;
  await sql`SELECT pg_notify('dashboard_events', ${JSON.stringify({ guildId: params.guildId, event: 'activity:new', module: params.module })})`;
}

import postgres from 'postgres';
import { env } from '../config/environment.js';
import { constants } from '../config/constants.js';

let sql: postgres.Sql | null = null;

export function getDb(): postgres.Sql {
  if (!sql) {
    sql = postgres(env.databaseUrl, {
      max: constants.dbPoolMax,
      idle_timeout: constants.dbIdleTimeout,
      connect_timeout: constants.dbConnectTimeout,
      ssl: env.databaseUrl.includes('localhost') || env.databaseUrl.includes('127.0.0.1') ? false : 'require',
      onnotice: () => {},
    });
  }
  return sql;
}

export async function validateConnection(): Promise<void> {
  const db = getDb();
  try {
    const result = await db`SELECT 1 as connected`;
    if (!result[0]?.connected) {
      throw new Error('Database validation query returned unexpected result');
    }
  } catch (error) {
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

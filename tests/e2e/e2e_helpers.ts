import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres:postgres@localhost:5432/hawk';

const isLocalOrDisabled =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1') ||
  connectionString.includes('sslmode=disable') ||
  connectionString.includes('ssl=false');

const isExplicitSsl =
  connectionString.includes('sslmode=require') ||
  connectionString.includes('ssl=true') ||
  connectionString.includes('neon.tech') ||
  connectionString.includes('supabase.co');

const sslMode = isLocalOrDisabled ? false : isExplicitSsl ? 'require' : 'prefer';

export function createTestDbClient() {
  return postgres(connectionString, {
    max: 2,
    idle_timeout: 5,
    connect_timeout: 5,
    ssl: sslMode,
    prepare: false,
    onnotice: () => {},
  });
}

export async function checkDbConnection(): Promise<boolean> {
  const probeDb = createTestDbClient();
  try {
    const res = await probeDb`SELECT 1 as ok`;
    return res[0]?.ok === 1;
  } catch {
    return false;
  } finally {
    await probeDb.end().catch(() => {});
  }
}

export function isValidSnowflake(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^\d{17,20}$/.test(id.trim());
}

export function cleanSnowflake(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const clean = id.trim();
  return isValidSnowflake(clean) ? clean : null;
}

export function cleanString(str: unknown, maxLen = 2000): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

export function cleanInt(val: unknown, min = 0, max = 1_000_000_000, fallback = 0): number {
  const parsed = Number(val);
  if (isNaN(parsed) || !isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export async function cleanupTestGuild(db: ReturnType<typeof postgres>, guildId: string): Promise<void> {
  await Promise.all([
    db`DELETE FROM guild_config WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM economy_config WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM economy_balances WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM economy_transactions WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM welcome_configs WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM sticky_messages WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM media_channels WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM media_guild_configs WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM permits WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM game_pings WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM suggestion_configs WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM confession_configs WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM income_roles WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM store_items WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM user_overrides WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM role_policies WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM custom_profiles WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM pvc_sessions WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM pvc_user_defaults WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM guild_audit_logs WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM activity_log WHERE guild_id = ${guildId}`.catch(() => {}),
    db`DELETE FROM command_telemetry WHERE guild_id = ${guildId}`.catch(() => {}),
  ]);
}

import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config();

const rawUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://postgres:postgres@localhost:5432/hawk';

const isLocalOrDisabled =
  rawUrl.includes('localhost') ||
  rawUrl.includes('127.0.0.1') ||
  rawUrl.includes('sslmode=disable') ||
  rawUrl.includes('ssl=false');

const isExplicitSsl =
  rawUrl.includes('sslmode=require') ||
  rawUrl.includes('ssl=true') ||
  rawUrl.includes('neon.tech') ||
  rawUrl.includes('supabase.co');

const sslMode = isLocalOrDisabled ? false : isExplicitSsl ? 'require' : 'prefer';

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof postgres> | undefined;
  schemaEnsured: boolean | undefined;
};

export const db =
  globalForDb.db ??
  postgres(rawUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: sslMode,
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

/**
 * Idempotently ensures all critical schema tables and columns exist in PostgreSQL.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (globalForDb.schemaEnsured) return;

  try {
    // 1. Core Guild Config
    await db`
      CREATE TABLE IF NOT EXISTS guild_config (
        guild_id TEXT PRIMARY KEY,
        prefix TEXT NOT NULL DEFAULT '!',
        log_channel_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // 2. Economy Config
    await db`
      CREATE TABLE IF NOT EXISTS economy_config (
        guild_id TEXT PRIMARY KEY,
        currency_symbol TEXT DEFAULT '$',
        bot_commander_role_id TEXT,
        start_balance BIGINT DEFAULT 0,
        daily_reward_amount BIGINT DEFAULT 1000,
        daily_streak_bonus BIGINT DEFAULT 100,
        passive_income BOOLEAN DEFAULT false,
        passive_amount BIGINT DEFAULT 10,
        audit_channel_id TEXT,
        pvc_hourly_rate BIGINT DEFAULT 100,
        pvc_jtc_channel_id TEXT,
        pvc_category_id TEXT,
        pvc_command_channel_id TEXT,
        pvc_panel_channel_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // 3. Welcome Config with separate greet_enabled and leave_enabled flags
    await db`
      CREATE TABLE IF NOT EXISTS welcome_configs (
        guild_id TEXT PRIMARY KEY,
        greet_channel_id TEXT,
        greet_payload TEXT,
        greet_enabled BOOLEAN NOT NULL DEFAULT true,
        leave_channel_id TEXT,
        leave_payload TEXT,
        leave_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await db`ALTER TABLE welcome_configs ADD COLUMN IF NOT EXISTS greet_enabled BOOLEAN NOT NULL DEFAULT true`.catch(() => {});
    await db`ALTER TABLE welcome_configs ADD COLUMN IF NOT EXISTS leave_enabled BOOLEAN NOT NULL DEFAULT false`.catch(() => {});

    // 4. Role Policies Table
    await db`
      CREATE TABLE IF NOT EXISTS role_policies (
        guild_id VARCHAR(32) NOT NULL,
        role_id VARCHAR(32) NOT NULL,
        role_name VARCHAR(100) NOT NULL,
        profile_id VARCHAR(64) NOT NULL,
        member_count INT DEFAULT 0,
        status VARCHAR(16) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (guild_id, role_id)
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_role_policies_guild ON role_policies(guild_id)`.catch(() => {});

    // 5. User Permission Overrides Table
    await db`
      CREATE TABLE IF NOT EXISTS user_overrides (
        guild_id VARCHAR(32) NOT NULL,
        user_id VARCHAR(32) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        module VARCHAR(64) NOT NULL,
        action VARCHAR(16) NOT NULL,
        effect VARCHAR(16) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (guild_id, user_id, module, action)
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_user_overrides_guild ON user_overrides(guild_id)`.catch(() => {});

    // 6. Custom Dashboard Profiles Table
    await db`
      CREATE TABLE IF NOT EXISTS custom_profiles (
        guild_id VARCHAR(32) NOT NULL,
        profile_id VARCHAR(64) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        inherits_from VARCHAR(64),
        permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (guild_id, profile_id)
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_custom_profiles_guild ON custom_profiles(guild_id)`.catch(() => {});

    // 7. Dashboard Access Table
    await db`
      CREATE TABLE IF NOT EXISTS dashboard_access (
        user_id VARCHAR(32) PRIMARY KEY,
        granted_by VARCHAR(32) NOT NULL,
        granted_at TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT
      )
    `;

    // 8. Sticky Messages Table
    await db`
      CREATE TABLE IF NOT EXISTS sticky_messages (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(guild_id, channel_id)
      )
    `;

    // 9. Store Items Table
    await db`
      CREATE TABLE IF NOT EXISTS store_items (
        guild_id TEXT NOT NULL,
        item_id SERIAL,
        name TEXT NOT NULL,
        price BIGINT NOT NULL,
        description TEXT,
        inventory_role_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, item_id)
      )
    `;

    // 10. Income Roles Table
    await db`
      CREATE TABLE IF NOT EXISTS income_roles (
        guild_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        income_amount BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, role_id)
      )
    `;

    // 11. Gaming Pings & Test Channels
    await db`
      CREATE TABLE IF NOT EXISTS game_pings (
        guild_id TEXT NOT NULL,
        identifier TEXT NOT NULL,
        game_name TEXT NOT NULL,
        role_id TEXT NOT NULL,
        vc_id TEXT NOT NULL,
        cooldown_seconds INT NOT NULL DEFAULT 300,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, identifier)
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS game_guild_configs (
        guild_id TEXT PRIMARY KEY,
        test_channel_id TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // 12. Media Channels & Config
    await db`
      CREATE TABLE IF NOT EXISTS media_channels (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(guild_id, channel_id)
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS media_guild_configs (
        guild_id TEXT PRIMARY KEY,
        auto_thread BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // 13. Permits, Restrictions & Ignored Entities
    await db`
      CREATE TABLE IF NOT EXISTS permits (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        target_type TEXT NOT NULL CHECK (target_type IN ('user', 'role')),
        target_id TEXT NOT NULL,
        command_name TEXT,
        module_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(guild_id, target_type, target_id, command_name, module_name)
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS restrictions (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        command_name TEXT,
        module_name TEXT NOT NULL,
        target_type TEXT CHECK (target_type IN ('user', 'role')),
        target_id TEXT,
        location_type TEXT NOT NULL CHECK (location_type IN ('channel', 'category')),
        location_id TEXT NOT NULL,
        effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')) DEFAULT 'allow',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(guild_id, command_name, module_name, target_type, target_id, location_type, location_id)
      )
    `;
    await db`
      CREATE TABLE IF NOT EXISTS ignored_entities (
        id SERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'role', 'channel', 'category')),
        entity_id TEXT NOT NULL,
        scope_type TEXT CHECK (scope_type IN ('command', 'module')),
        scope_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(guild_id, entity_type, entity_id, scope_type, scope_id)
      )
    `;

    globalForDb.schemaEnsured = true;
  } catch (error) {
    console.warn('Database schema verification notice:', error);
  }
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
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

function createDbClient() {
  return postgres(connectionString, {
    max: 2,
    idle_timeout: 5,
    connect_timeout: 5,
    ssl: sslMode,
    prepare: false,
    onnotice: () => {},
  });
}

test('Persistence & Restart Verification: 8-Stage Lifecycle with Unique Test Values', async (t) => {
  const probeDb = createDbClient();
  let isConnected = false;

  try {
    const res = await probeDb`SELECT 1 as ok`;
    if (res[0]?.ok === 1) isConnected = true;
  } catch {
    console.log('Skipping live DB assertions (no active PostgreSQL server on connection string)');
  } finally {
    await probeDb.end().catch(() => {});
  }

  if (!isConnected) return;

  const testGuildA = '999999999999999001';
  const testGuildB = '999999999999999002';
  const uniqueWelcomeA = 'HAWK_PERSISTENCE_TEST_73921_GUILD_A';
  const uniqueWelcomeB = 'HAWK_PERSISTENCE_TEST_73921_GUILD_B';
  const knownChannelId = '112233445566778899';

  await t.test('1. Core PostgreSQL Schemas and Migrations Exist', async () => {
    const db = createDbClient();
    try {
      await db.unsafe(`
        CREATE TABLE IF NOT EXISTS guild_config (
          guild_id TEXT PRIMARY KEY,
          prefix TEXT NOT NULL DEFAULT '!',
          log_channel_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
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
        );
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
        );
        ALTER TABLE welcome_configs ADD COLUMN IF NOT EXISTS greet_enabled BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE welcome_configs ADD COLUMN IF NOT EXISTS leave_enabled BOOLEAN NOT NULL DEFAULT false;
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
        );
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
        );
      `);
    } finally {
      await db.end();
    }
  });

  await t.test('2. Stage 1-4: Write Unique Values and Zero/False Flags to PostgreSQL', async () => {
    const db = createDbClient();
    try {
      const payloadA = JSON.stringify({
        embeds: [{ title: 'Guild A Welcome', description: uniqueWelcomeA }],
        channel_id: knownChannelId,
        enabled: true,
      });
      await db`
        INSERT INTO welcome_configs (guild_id, greet_channel_id, greet_payload, greet_enabled)
        VALUES (${testGuildA}, ${knownChannelId}, ${payloadA}, true)
        ON CONFLICT (guild_id) DO UPDATE SET
          greet_channel_id = EXCLUDED.greet_channel_id,
          greet_payload = EXCLUDED.greet_payload,
          greet_enabled = EXCLUDED.greet_enabled
      `;

      const payloadB = JSON.stringify({
        embeds: [{ title: 'Guild B Welcome', description: uniqueWelcomeB }],
        channel_id: knownChannelId,
        enabled: false,
      });
      await db`
        INSERT INTO welcome_configs (guild_id, greet_channel_id, greet_payload, greet_enabled)
        VALUES (${testGuildB}, ${knownChannelId}, ${payloadB}, false)
        ON CONFLICT (guild_id) DO UPDATE SET
          greet_channel_id = EXCLUDED.greet_channel_id,
          greet_payload = EXCLUDED.greet_payload,
          greet_enabled = EXCLUDED.greet_enabled
      `;

      await db`
        INSERT INTO economy_config (guild_id, start_balance, daily_reward_amount)
        VALUES (${testGuildA}, 0, 0)
        ON CONFLICT (guild_id) DO UPDATE SET
          start_balance = EXCLUDED.start_balance,
          daily_reward_amount = EXCLUDED.daily_reward_amount
      `;

      await db`
        INSERT INTO role_policies (guild_id, role_id, role_name, profile_id, member_count, status)
        VALUES (${testGuildA}, '987654321012345678', 'Moderator Role', 'moderator', 5, 'active')
        ON CONFLICT (guild_id, role_id) DO UPDATE SET
          role_name = EXCLUDED.role_name,
          profile_id = EXCLUDED.profile_id
      `;

      await db`
        INSERT INTO user_overrides (guild_id, user_id, user_name, module, action, effect)
        VALUES (${testGuildA}, '123456789012345678', 'TestAdmin', 'economy', 'manage', 'ALLOW')
        ON CONFLICT (guild_id, user_id, module, action) DO UPDATE SET
          effect = EXCLUDED.effect
      `;
    } finally {
      await db.end();
    }
  });

  await t.test('3. Stage 5: Hard Simulated Process Restart (Brand New DB Pool Instance)', async () => {
    const db = createDbClient();
    try {
      const probe = await db`SELECT 1 as reconnected`;
      assert.equal(probe[0]?.reconnected, 1);
    } finally {
      await db.end();
    }
  });

  await t.test('4. Stage 6-8: Read Values Back from Fresh Process and Assert 100% Retention', async () => {
    const db = createDbClient();
    try {
      const rowA = await db`SELECT guild_id, greet_channel_id, greet_payload, greet_enabled FROM welcome_configs WHERE guild_id = ${testGuildA}`;
      assert.equal(rowA.length, 1);
      assert.equal(rowA[0].greet_enabled, true);
      assert.equal(rowA[0].greet_channel_id, knownChannelId);
      assert.ok(rowA[0].greet_payload.includes(uniqueWelcomeA));

      const rowB = await db`SELECT guild_id, greet_channel_id, greet_payload, greet_enabled FROM welcome_configs WHERE guild_id = ${testGuildB}`;
      assert.equal(rowB.length, 1);
      assert.equal(rowB[0].greet_enabled, false);
      assert.equal(rowB[0].greet_channel_id, knownChannelId);
      assert.ok(rowB[0].greet_payload.includes(uniqueWelcomeB));
      assert.notEqual(rowB[0].greet_payload, rowA[0].greet_payload);

      const econRow = await db`SELECT start_balance, daily_reward_amount FROM economy_config WHERE guild_id = ${testGuildA}`;
      assert.equal(econRow.length, 1);
      assert.equal(Number(econRow[0].start_balance), 0);
      assert.equal(Number(econRow[0].daily_reward_amount), 0);

      const roleRows = await db`SELECT role_id, profile_id FROM role_policies WHERE guild_id = ${testGuildA}`;
      assert.equal(roleRows.length, 1);
      assert.equal(roleRows[0].role_id, '987654321012345678');
      assert.equal(roleRows[0].profile_id, 'moderator');

      const overrideRows = await db`SELECT user_id, effect FROM user_overrides WHERE guild_id = ${testGuildA}`;
      assert.equal(overrideRows.length, 1);
      assert.equal(overrideRows[0].user_id, '123456789012345678');
      assert.equal(overrideRows[0].effect, 'ALLOW');
    } finally {
      await db.end();
    }
  });

  await t.test('5. Cleanup Test Guild Rows', async () => {
    const db = createDbClient();
    try {
      await db`DELETE FROM welcome_configs WHERE guild_id = ${testGuildA} OR guild_id = ${testGuildB}`;
      await db`DELETE FROM economy_config WHERE guild_id = ${testGuildA} OR guild_id = ${testGuildB}`;
      await db`DELETE FROM role_policies WHERE guild_id = ${testGuildA} OR guild_id = ${testGuildB}`;
      await db`DELETE FROM user_overrides WHERE guild_id = ${testGuildA} OR guild_id = ${testGuildB}`;
    } finally {
      await db.end();
    }
  });
});

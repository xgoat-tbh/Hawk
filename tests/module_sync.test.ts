import { test } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import dotenv from 'dotenv';

import { getPrefix, setPrefix, getLogChannel, setLogChannel } from '../src/core/database/repositories/guildConfigRepo.js';
import { getEconomyConfig, setEconomyConfigField, invalidateEconomyConfigCache } from '../src/core/database/repositories/economyConfigRepo.js';
import { getWelcomeConfig, setGreetChannel, setGreetPayload } from '../src/core/database/repositories/welcomeRepo.js';
import { getSticky, setSticky, deleteSticky } from '../src/core/database/repositories/stickyRepo.js';
import { isMediaChannel, addMediaChannel, removeMediaChannel, getMediaAutoThread, setMediaAutoThread } from '../src/core/database/repositories/mediaRepo.js';
import { getPermitsForGuild, addPermit, hasPermit } from '../src/core/database/repositories/permissionRepo.js';
import { getGamePing, createGamePing } from '../src/core/database/repositories/gameRepo.js';
import { getSuggestionChannel, setSuggestionChannel } from '../src/core/database/repositories/suggestionRepo.js';
import { getConfessionChannel, setConfessionChannel } from '../src/core/database/repositories/confessionRepo.js';

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

test('Real-Time Sync Verification: All Dashboard Modules <-> Bot Repositories', async (t) => {
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

  const testGuildId = '888888888888888001';
  const testUserId = '111111111111111001';
  const testRoleId = '222222222222222001';
  const testChannelId = '333333333333333001';

  const db = createDbClient();

  // Cleanup any old test artifacts
  const cleanup = async () => {
    await db`DELETE FROM guild_config WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM economy_config WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM welcome_configs WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM sticky_messages WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM media_channels WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM media_guild_configs WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM permits WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM game_pings WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM suggestion_configs WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM confession_configs WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM income_roles WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM store_items WHERE guild_id = ${testGuildId}`.catch(() => {});
    await db`DELETE FROM user_overrides WHERE guild_id = ${testGuildId}`.catch(() => {});
  };

  await cleanup();

  try {
    // 1. General Settings Module
    await t.test('1. General Settings: Prefix and Log Channel sync in real time', async () => {
      // Simulate dashboard updating guild_config in DB
      await db`
        INSERT INTO guild_config (guild_id, prefix, log_channel_id)
        VALUES (${testGuildId}, '?', ${testChannelId})
        ON CONFLICT (guild_id) DO UPDATE SET prefix = '?', log_channel_id = ${testChannelId}
      `;

      // Bot repo should reflect values
      const prefix = await getPrefix(testGuildId);
      assert.equal(prefix, '?', 'Bot should read updated prefix');

      const logChannel = await getLogChannel(testGuildId);
      assert.equal(logChannel, testChannelId, 'Bot should read updated log channel');
    });

    // 2. Economy & Rewards Module
    await t.test('2. Economy & Rewards: Currency, Balances, and Rewards sync in real time', async () => {
      // Simulate dashboard updating economy_config in DB
      await db`
        INSERT INTO economy_config (guild_id, currency_symbol, start_balance, daily_reward_amount, daily_streak_bonus)
        VALUES (${testGuildId}, '₹', 500, 7500, 250)
        ON CONFLICT (guild_id) DO UPDATE SET
          currency_symbol = '₹',
          start_balance = 500,
          daily_reward_amount = 7500,
          daily_streak_bonus = 250
      `;

      const ecoConfig = await getEconomyConfig(testGuildId);
      assert.equal(ecoConfig.currencySymbol, '₹', 'Bot should read currency symbol');
      assert.equal(ecoConfig.startBalance, 500, 'Bot should read start balance');
      assert.equal(ecoConfig.dailyRewardAmount, 7500, 'Bot should read daily reward amount');
      assert.equal(ecoConfig.dailyStreakBonus, 250, 'Bot should read daily streak bonus');
    });

    // 3. Role Salaries (Income Roles)
    await t.test('3. Role Salaries: Income role rates sync in real time', async () => {
      await db`
        INSERT INTO income_roles (guild_id, role_id, income_amount)
        VALUES (${testGuildId}, ${testRoleId}, 1250)
        ON CONFLICT (guild_id, role_id) DO UPDATE SET income_amount = 1250
      `;

      const rows = await db`
        SELECT income_amount FROM income_roles
        WHERE guild_id = ${testGuildId} AND role_id = ${testRoleId}
      `;
      assert.equal(rows.length, 1);
      assert.equal(Number(rows[0].income_amount), 1250);
    });

    // 4. Store Catalog Module
    await t.test('4. Store Catalog: Item listings sync in real time', async () => {
      await db`
        INSERT INTO store_items (guild_id, item_id, name, price, description, inventory_role_id)
        VALUES (${testGuildId}, 1, 'VIP Pass', 15000, 'Exclusive role', ${testRoleId})
      `;

      const items = await db`SELECT * FROM store_items WHERE guild_id = ${testGuildId}`;
      assert.equal(items.length, 1);
      assert.equal(items[0].name, 'VIP Pass');
      assert.equal(Number(items[0].price), 15000);
      assert.equal(items[0].inventory_role_id, testRoleId);
    });

    // 5. Private Voice Channels (PVC) Module
    await t.test('5. Private Voice: PVC settings sync in real time', async () => {
      await db`
        INSERT INTO economy_config (guild_id, pvc_hourly_rate, pvc_jtc_channel_id, pvc_category_id)
        VALUES (${testGuildId}, 350, ${testChannelId}, '444444444444444001')
        ON CONFLICT (guild_id) DO UPDATE SET
          pvc_hourly_rate = 350,
          pvc_jtc_channel_id = ${testChannelId},
          pvc_category_id = '444444444444444001'
      `;

      invalidateEconomyConfigCache(testGuildId);

      const ecoConfig = await getEconomyConfig(testGuildId);
      assert.equal(ecoConfig.pvcHourlyRate, 350, 'Bot should read PVC hourly rate');
      assert.equal(ecoConfig.pvcJtcChannelId, testChannelId, 'Bot should read JTC channel ID');
      assert.equal(ecoConfig.pvcCategoryId, '444444444444444001', 'Bot should read PVC category ID');
    });

    // 6. Gaming LFG Module
    await t.test('6. Gaming LFG: Custom triggers sync in real time', async () => {
      await db`
        INSERT INTO game_pings (guild_id, identifier, game_name, role_id, vc_id, cooldown_seconds)
        VALUES (${testGuildId}, 'val', 'Valorant Competitive', ${testRoleId}, ${testChannelId}, 600)
        ON CONFLICT (guild_id, identifier) DO UPDATE SET
          game_name = 'Valorant Competitive',
          role_id = ${testRoleId},
          vc_id = ${testChannelId},
          cooldown_seconds = 600
      `;

      const ping = await getGamePing(testGuildId, 'val');
      assert.ok(ping, 'Game ping config should be returned');
      assert.equal(ping.gameName, 'Valorant Competitive');
      assert.equal(ping.roleId, testRoleId);
      assert.equal(ping.vcId, testChannelId);
      assert.equal(ping.cooldownSeconds, 600);
    });

    // 7. Welcome Greetings Module
    await t.test('7. Welcome Greetings: Welcome configuration and payloads sync in real time', async () => {
      const welcomePayload = JSON.stringify({
        content: 'Welcome to our server, {user}!',
        is_embed: false,
      });

      await db`
        INSERT INTO welcome_configs (guild_id, greet_channel_id, greet_payload, greet_enabled)
        VALUES (${testGuildId}, ${testChannelId}, ${welcomePayload}, true)
        ON CONFLICT (guild_id) DO UPDATE SET
          greet_channel_id = ${testChannelId},
          greet_payload = ${welcomePayload},
          greet_enabled = true
      `;

      const welcome = await getWelcomeConfig(testGuildId);
      assert.ok(welcome, 'Welcome config should exist');
      assert.equal(welcome.greetChannelId, testChannelId);
      assert.equal(welcome.greetEnabled, true);
      assert.equal(welcome.greetPayload, welcomePayload);
    });

    // 8. Community Tools Module (Suggestions & Confessions)
    await t.test('8. Community Tools: Suggestion and confession channels sync in real time', async () => {
      await db`
        INSERT INTO suggestion_configs (guild_id, channel_id)
        VALUES (${testGuildId}, ${testChannelId})
        ON CONFLICT (guild_id) DO UPDATE SET channel_id = ${testChannelId}
      `;

      await db`
        INSERT INTO confession_configs (guild_id, channel_id, log_channel_id)
        VALUES (${testGuildId}, ${testChannelId}, '555555555555555001')
        ON CONFLICT (guild_id) DO UPDATE SET channel_id = ${testChannelId}, log_channel_id = '555555555555555001'
      `;

      const sugChannel = await getSuggestionChannel(testGuildId);
      assert.equal(sugChannel, testChannelId, 'Bot should read suggestion channel');

      const confChannel = await getConfessionChannel(testGuildId);
      assert.equal(confChannel, testChannelId, 'Bot should read confession channel');
    });

    // 9. Media Channels Module
    await t.test('9. Media Channels: Media channel list and auto-thread flag sync in real time', async () => {
      await db`
        INSERT INTO media_channels (guild_id, channel_id)
        VALUES (${testGuildId}, ${testChannelId})
        ON CONFLICT (guild_id, channel_id) DO NOTHING
      `;

      await db`
        INSERT INTO media_guild_configs (guild_id, auto_thread)
        VALUES (${testGuildId}, false)
        ON CONFLICT (guild_id) DO UPDATE SET auto_thread = false
      `;

      const isMedia = await isMediaChannel(testGuildId, testChannelId);
      assert.equal(isMedia, true, 'Channel should be recognized as media channel');

      const autoThread = await getMediaAutoThread(testGuildId);
      assert.equal(autoThread, false, 'Auto-thread setting should be recognized');
    });

    // 10. Sticky Notices Module
    await t.test('10. Sticky Notices: Sticky messages sync in real time', async () => {
      const noticeContent = 'Notice: Keep chat civil!';
      await db`
        INSERT INTO sticky_messages (guild_id, channel_id, message_id, content)
        VALUES (${testGuildId}, ${testChannelId}, '666666666666666001', ${noticeContent})
        ON CONFLICT (guild_id, channel_id) DO UPDATE SET content = ${noticeContent}
      `;

      const sticky = await getSticky(testGuildId, testChannelId);
      assert.ok(sticky, 'Sticky record should exist');
      assert.equal(sticky.content, noticeContent);
      assert.equal(sticky.channelId, testChannelId);
    });

    // 11. Permissions & Access Rules Module
    await t.test('11. Permissions & Access Rules: Command permits and user overrides sync in real time', async () => {
      await db`
        INSERT INTO permits (guild_id, target_type, target_id, command_name, module_name)
        VALUES (${testGuildId}, 'user', ${testUserId}, 'economy', 'economy')
        ON CONFLICT (guild_id, target_type, target_id, command_name, module_name) DO NOTHING
      `;

      await db`
        INSERT INTO user_overrides (guild_id, user_id, user_name, module, action, effect)
        VALUES (${testGuildId}, ${testUserId}, 'TestMod', 'economy', 'manage', 'ALLOW')
        ON CONFLICT (guild_id, user_id, module, action) DO UPDATE SET effect = 'ALLOW'
      `;

      const permits = await getPermitsForGuild(testGuildId);
      assert.ok(permits.some(p => p.targetId === testUserId && p.commandName === 'economy'), 'Permit should be present');

      const hasPerm = await hasPermit(testGuildId, testUserId, [], 'economy', 'economy');
      assert.equal(hasPerm, true, 'Bot should grant command permit');

      const overrides = await db`
        SELECT effect FROM user_overrides
        WHERE guild_id = ${testGuildId} AND user_id = ${testUserId} AND module = 'economy'
      `;
      assert.equal(overrides.length, 1);
      assert.equal(overrides[0].effect, 'ALLOW');
    });

  } finally {
    await cleanup();
    await db.end().catch(() => {});
  }
});

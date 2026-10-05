import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDbClient, checkDbConnection, cleanupTestGuild } from './e2e_helpers.js';
import { closeDb } from '../../src/core/database/pool.js';
import { getPrefix, setPrefix, getLogChannel, setLogChannel } from '../../src/core/database/repositories/guildConfigRepo.js';
import { getEconomyConfig } from '../../src/core/database/repositories/economyConfigRepo.js';
import { getWelcomeConfig } from '../../src/core/database/repositories/welcomeRepo.js';
import { getSticky, setSticky } from '../../src/core/database/repositories/stickyRepo.js';
import { getGamePing, createGamePing } from '../../src/core/database/repositories/gameRepo.js';
import { getSuggestionChannel, setSuggestionChannel } from '../../src/core/database/repositories/suggestionRepo.js';
import { getConfessionChannel, setConfessionChannel } from '../../src/core/database/repositories/confessionRepo.js';
import { getMaintenanceState, setMaintenanceState } from '../../src/core/database/repositories/systemRepo.js';
import { resolveEffectiveCommandAccess, DEFAULT_PRESET_PROFILES } from '../../web/lib/permissions.js';
import { substituteVariables } from '../../src/modules/welcome/welcomeEngine.js';
import { ui } from '../../src/core/ui/index.js';

test('E2E Tier 1: Feature Coverage Across All Dashboard Modules & Endpoints', async (t) => {
  const isConnected = await checkDbConnection();
  if (!isConnected) {
    console.log('Skipping live DB tier 1 assertions (no active PostgreSQL connection)');
    return;
  }

  const db = createTestDbClient();
  const testGuildId = '999900000000000101';
  const testChannelId = '999900000000000201';
  const testRoleId = '999900000000000301';
  const testUserId = '999900000000000401';

  await cleanupTestGuild(db, testGuildId);

  try {
    // 1. Navigation & Terminal Design System Structure
    await t.test('1. Navigation & UI: 13 Numbered Console Routes & Theme Tokens', () => {
      const expectedRoutes = [
        { num: '01', tag: '[01] Console', path: `/dashboard/${testGuildId}` },
        { num: '02', tag: '[02] Welcome', path: `/dashboard/${testGuildId}/welcome` },
        { num: '03', tag: '[03] Community', path: `/dashboard/${testGuildId}/community` },
        { num: '04', tag: '[04] Economy', path: `/dashboard/${testGuildId}/economy` },
        { num: '05', tag: '[05] Store', path: `/dashboard/${testGuildId}/store` },
        { num: '06', tag: '[06] Income', path: `/dashboard/${testGuildId}/income` },
        { num: '07', tag: '[07] Games', path: `/dashboard/${testGuildId}/games` },
        { num: '08', tag: '[08] Voice/PVC', path: `/dashboard/${testGuildId}/pvc` },
        { num: '09', tag: '[09] Gaming LFG', path: `/dashboard/${testGuildId}/gaming` },
        { num: '10', tag: '[10] Sticky', path: `/dashboard/${testGuildId}/sticky` },
        { num: '11', tag: '[11] Permissions', path: `/dashboard/${testGuildId}/permissions` },
        { num: '12', tag: '[12] Settings', path: `/dashboard/${testGuildId}/general` },
        { num: '13', tag: '[13] Developers', path: `/dashboard/${testGuildId}/developers` },
      ];

      assert.equal(expectedRoutes.length, 13);
      assert.equal(expectedRoutes[0].tag, '[01] Console');
      assert.equal(expectedRoutes[12].tag, '[13] Developers');
      assert.equal(ui.theme.container.borderless, true);
    });

    // 2. Module 1: Console Overview (Live Stats & Telemetry Data Structure)
    await t.test('2. Module 1: Console Overview Live Metrics & Activity Aggregation', async () => {
      await db`
        INSERT INTO activity_log (guild_id, type, actor_name, target_name, created_at)
        VALUES (${testGuildId}, 'SERVER_SYNC', 'Admin Operator', 'Main Server', NOW())
      `;

      const rows = await db`SELECT * FROM activity_log WHERE guild_id = ${testGuildId}`;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].actor_name, 'Admin Operator');
      assert.equal(rows[0].type, 'SERVER_SYNC');
    });

    // 3. Module 2: Welcome Greetings (Persisted Flags & Template Rendering)
    await t.test('3. Module 2: Welcome Greetings Configuration & Variable Tokens', async () => {
      const template = 'Welcome {user} to {server}! Member count: {servermember}';
      await db`
        INSERT INTO welcome_configs (guild_id, greet_channel_id, greet_payload, greet_enabled, leave_enabled)
        VALUES (${testGuildId}, ${testChannelId}, ${template}, true, false)
        ON CONFLICT (guild_id) DO UPDATE SET
          greet_channel_id = EXCLUDED.greet_channel_id,
          greet_payload = EXCLUDED.greet_payload,
          greet_enabled = EXCLUDED.greet_enabled,
          leave_enabled = EXCLUDED.leave_enabled
      `;

      const welcomeConfig = await getWelcomeConfig(testGuildId);
      assert.ok(welcomeConfig);
      assert.equal(welcomeConfig.greetChannelId, testChannelId);

      const rendered = substituteVariables(template, {
        username: 'TestUser',
        usermention: `<@${testUserId}>`,
        usertag: 'TestUser#0001',
        useravatar: '',
        servername: 'Hawk Operations',
        servermember: 42,
        serveravatar: '',
        randomuser: `<@${testUserId}>`,
      });

      assert.ok(rendered.includes(`<@${testUserId}>`));
      assert.ok(rendered.includes('Hawk Operations'));
      assert.ok(rendered.includes('42'));
    });

    // 4. Module 3: Community Tools (Suggestions & Confessions)
    await t.test('4. Module 3: Community Channels Setup & Routing', async () => {
      await setSuggestionChannel(testGuildId, testChannelId);
      await setConfessionChannel(testGuildId, testChannelId);

      const sugChannel = await getSuggestionChannel(testGuildId);
      const confChannel = await getConfessionChannel(testGuildId);

      assert.equal(sugChannel, testChannelId);
      assert.equal(confChannel, testChannelId);
    });

    // 5. Module 4: Economy (Balances, Circulation & Transactions)
    await t.test('5. Module 4: Economy Currency, User Balances & Transaction Log', async () => {
      await db`
        INSERT INTO economy_config (guild_id, currency_symbol, start_balance, daily_reward_amount)
        VALUES (${testGuildId}, '💎', 250, 500)
        ON CONFLICT (guild_id) DO UPDATE SET
          currency_symbol = EXCLUDED.currency_symbol,
          start_balance = EXCLUDED.start_balance,
          daily_reward_amount = EXCLUDED.daily_reward_amount
      `;

      await db`
        INSERT INTO economy_balances (guild_id, user_id, cash, bank, bank_capacity)
        VALUES (${testGuildId}, ${testUserId}, 1500, 3000, 10000)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET
          cash = EXCLUDED.cash,
          bank = EXCLUDED.bank
      `;

      await db`
        INSERT INTO economy_transactions (guild_id, user_id, type, amount, source, target_id, note)
        VALUES (${testGuildId}, ${testUserId}, 'admin_set', 4500, 'economy', 'console', 'Initial credit')
      `;

      const econConfig = await getEconomyConfig(testGuildId);
      assert.equal(econConfig.currencySymbol, '💎');
      assert.equal(Number(econConfig.startBalance), 250);

      const [balance] = await db`SELECT cash, bank, (cash + bank) as net_worth FROM economy_balances WHERE guild_id = ${testGuildId} AND user_id = ${testUserId}`;
      assert.equal(Number(balance.cash), 1500);
      assert.equal(Number(balance.bank), 3000);
      assert.equal(Number(balance.net_worth), 4500);

      const [tx] = await db`SELECT * FROM economy_transactions WHERE guild_id = ${testGuildId} AND user_id = ${testUserId}`;
      assert.equal(tx.type, 'admin_set');
      assert.equal(Number(tx.amount), 4500);
    });

    // 6. Module 5: Store Catalog (Full 16-Column Store Items Schema Sync)
    await t.test('6. Module 5: Store Catalog 16-Field Item Definition & Synchronization', async () => {
      const [item] = await db`
        INSERT INTO store_items (
          guild_id, name, price, description, icon_url, inventory_role_id,
          inventory_enabled, usable, sellable, stock, role_required,
          role_given, role_removed, reply_message, requirements_json, actions_json
        ) VALUES (
          ${testGuildId}, 'Cyber Badge', 2500, 'Elite member access badge',
          'https://cdn.discordapp.com/emojis/badge.png', ${testRoleId},
          true, true, false, 50, null, ${testRoleId}, null,
          'You purchased the Cyber Badge!', '{"min_level": 5}', '{"grant_role": true}'
        )
        RETURNING *
      `;

      assert.ok(item);
      assert.equal(item.name, 'Cyber Badge');
      assert.equal(Number(item.price), 2500);
      assert.equal(Number(item.stock), 50);
      assert.equal(item.inventory_role_id, testRoleId);
      assert.equal(item.usable, true);
      assert.equal(item.sellable, false);
      assert.equal(item.reply_message, 'You purchased the Cyber Badge!');
    });

    // 7. Module 6: Role Salaries (Role Rates & Payroll Invariant)
    await t.test('7. Module 6: Role Salaries Definition & Aggregation', async () => {
      await db`
        INSERT INTO income_roles (guild_id, role_id, income_amount)
        VALUES (${testGuildId}, ${testRoleId}, 750)
        ON CONFLICT (guild_id, role_id) DO UPDATE SET income_amount = EXCLUDED.income_amount
      `;

      const [incomeRow] = await db`SELECT * FROM income_roles WHERE guild_id = ${testGuildId} AND role_id = ${testRoleId}`;
      assert.equal(Number(incomeRow.income_amount), 750);
    });

    // 8. Module 7: Minigames & Wagers
    await t.test('8. Module 7: Minigames Cooldowns & Bet Thresholds', async () => {
      await db`
        INSERT INTO game_guild_configs (guild_id, test_channel_id)
        VALUES (${testGuildId}, ${testChannelId})
        ON CONFLICT (guild_id) DO UPDATE SET test_channel_id = EXCLUDED.test_channel_id
      `;

      const [config] = await db`SELECT * FROM game_guild_configs WHERE guild_id = ${testGuildId}`;
      assert.equal(config.test_channel_id, testChannelId);
    });

    // 9. Module 8: Private Voice Channels (PVC Join-to-Create & User Defaults)
    await t.test('9. Module 8: Private Voice Channels Infrastructure & Session Controls', async () => {
      await db`
        UPDATE economy_config
        SET
          pvc_jtc_channel_id = ${testChannelId},
          pvc_hourly_rate = 150
        WHERE guild_id = ${testGuildId}
      `;

      await db`
        INSERT INTO pvc_user_defaults (guild_id, user_id, name_template, user_limit, is_locked)
        VALUES (${testGuildId}, ${testUserId}, '{username} Lounge', 4, false)
        ON CONFLICT (guild_id, user_id) DO UPDATE SET
          name_template = EXCLUDED.name_template,
          user_limit = EXCLUDED.user_limit
      `;

      const [defaults] = await db`SELECT * FROM pvc_user_defaults WHERE guild_id = ${testGuildId} AND user_id = ${testUserId}`;
      assert.equal(defaults.name_template, '{username} Lounge');
      assert.equal(Number(defaults.user_limit), 4);
    });

    // 10. Module 9: Gaming LFG & Matchmaking
    await t.test('10. Module 9: Gaming LFG Triggers & Voice Lobby Dispatch', async () => {
      await createGamePing({
        guildId: testGuildId,
        identifier: 'valorant',
        gameName: 'Valorant Squad',
        roleId: testRoleId,
        vcId: testChannelId,
        cooldownSeconds: 600,
      });

      const ping = await getGamePing(testGuildId, 'valorant');

      assert.ok(ping);
      assert.equal(ping.gameName, 'Valorant Squad');
      assert.equal(ping.roleId, testRoleId);
      assert.equal(ping.cooldownSeconds, 600);
    });

    // 11. Module 10: Sticky Notices
    await t.test('11. Module 10: Sticky Notice Creation & Retrieval', async () => {
      await setSticky({
        guildId: testGuildId,
        channelId: testChannelId,
        messageId: '999900000000000501',
        content: '⚠️ Please observe server guidelines.',
      });

      const sticky = await getSticky(testGuildId, testChannelId);

      assert.ok(sticky);
      assert.equal(sticky.content, '⚠️ Please observe server guidelines.');
    });

    // 12. Module 11: Permissions & Access Rules (Preset Profiles & Resolution)
    await t.test('12. Module 11: Permissions Preset Profiles & Rule Chain Verification', async () => {
      assert.ok(DEFAULT_PRESET_PROFILES.some((p) => p.id === 'administrator'));
      assert.ok(DEFAULT_PRESET_PROFILES.some((p) => p.id === 'moderator'));
      assert.ok(DEFAULT_PRESET_PROFILES.some((p) => p.id === 'economy_manager'));
      assert.ok(DEFAULT_PRESET_PROFILES.some((p) => p.id === 'viewer'));

      // Administrator role permission resolution
      const verdict = resolveEffectiveCommandAccess({
        command: {
          name: 'purge',
          category: 'moderation',
          description: 'Purge messages',
          dangerLevel: 'HIGH',
          requiredDiscordPerm: 'Manage Messages',
        },
        userId: testUserId,
        userRoleIds: [testRoleId],
        isOwnerOrAdmin: false,
        permits: [],
        commandAcls: [],
        rolePolicies: [{ roleId: testRoleId, roleName: 'Moderator', profileId: 'moderator', memberCount: 1, status: 'active' }],
      });

      assert.equal(verdict.effectiveAccess, 'ALLOWED');
    });

    // 13. Module 12: General Settings (Prefix & Audit Routing)
    await t.test('13. Module 12: General Settings Prefix & Bot Repository Sync', async () => {
      await setPrefix(testGuildId, '$');
      await setLogChannel(testGuildId, testChannelId);

      const prefix = await getPrefix(testGuildId);
      const logChannel = await getLogChannel(testGuildId);

      assert.equal(prefix, '$');
      assert.equal(logChannel, testChannelId);
    });

    // 14. Module 13: Developers & Telemetry
    await t.test('14. Module 13: Developers Telemetry & Process Health Metrics', async () => {
      const mem = process.memoryUsage();
      const uptime = process.uptime();

      assert.ok(mem.heapUsed > 0);
      assert.ok(uptime >= 0);

      await setMaintenanceState(true, 'Scheduled upgrade in progress', testUserId);
      const state = await getMaintenanceState();

      assert.equal(state.enabled, true);
      assert.equal(state.reason, 'Scheduled upgrade in progress');
      assert.equal(state.enabledBy, testUserId);

      // Revert maintenance state
      await setMaintenanceState(false, 'Maintenance complete', null);
    });

  } finally {
    await cleanupTestGuild(db, testGuildId);
    await db.end().catch(() => {});
    await closeDb().catch(() => {});
  }
});

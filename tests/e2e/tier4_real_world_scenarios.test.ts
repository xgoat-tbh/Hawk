import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDbClient, checkDbConnection, cleanupTestGuild } from './e2e_helpers.js';
import { closeDb } from '../../src/core/database/pool.js';
import { getPrefix, setPrefix, getLogChannel, setLogChannel } from '../../src/core/database/repositories/guildConfigRepo.js';
import { getEconomyConfig } from '../../src/core/database/repositories/economyConfigRepo.js';
import { getWelcomeConfig } from '../../src/core/database/repositories/welcomeRepo.js';
import { getSticky, setSticky, deleteSticky } from '../../src/core/database/repositories/stickyRepo.js';
import { getMaintenanceState, setMaintenanceState } from '../../src/core/database/repositories/systemRepo.js';
import { resolveEffectiveCommandAccess, DEFAULT_PRESET_PROFILES } from '../../web/lib/permissions.js';
import { substituteVariables } from '../../src/modules/welcome/welcomeEngine.js';

test('E2E Tier 4: Real-World Scenarios (End-to-End Administrative Lifecycles)', async (t) => {
  const isConnected = await checkDbConnection();
  if (!isConnected) {
    console.log('Skipping live DB tier 4 assertions (no active PostgreSQL connection)');
    return;
  }

  const db = createTestDbClient();
  const testGuildId = '999900000000000104';
  const testChannelId = '999900000000000204';
  const testAuditChannelId = '999900000000000205';
  const testLogChannelId = '999900000000000206';
  const testCommanderRoleId = '999900000000000306';
  const testModRoleId = '999900000000000307';
  const testJuniorModRoleId = '999900000000000308';
  const testGoldRoleId = '999900000000000309';
  const testAdminUserId = '999900000000000404';
  const testRogueUserId = '999900000000000405';

  await cleanupTestGuild(db, testGuildId);

  try {
    // Scenario 1: Complete Administrator Server Setup & Onboarding Workflow
    await t.test('Scenario 1: Complete Administrator Server Setup & Initial Configuration', async () => {
      // 1. General Settings configuration
      await db.begin(async (tx) => {
        await tx`
          INSERT INTO guild_config (guild_id, prefix, log_channel_id)
          VALUES (${testGuildId}, '?', ${testLogChannelId})
          ON CONFLICT (guild_id) DO UPDATE SET
            prefix = EXCLUDED.prefix,
            log_channel_id = EXCLUDED.log_channel_id,
            updated_at = NOW()
        `;

        await tx`
          INSERT INTO economy_config (
            guild_id, currency_symbol, bot_commander_role_id, start_balance,
            daily_reward_amount, daily_streak_bonus, passive_income, passive_amount,
            audit_channel_id, pvc_hourly_rate, pvc_jtc_channel_id
          ) VALUES (
            ${testGuildId}, '🪙', ${testCommanderRoleId}, 500,
            1000, 150, true, 15,
            ${testAuditChannelId}, 120, ${testChannelId}
          )
          ON CONFLICT (guild_id) DO UPDATE SET
            currency_symbol = EXCLUDED.currency_symbol,
            bot_commander_role_id = EXCLUDED.bot_commander_role_id,
            start_balance = EXCLUDED.start_balance,
            daily_reward_amount = EXCLUDED.daily_reward_amount,
            daily_streak_bonus = EXCLUDED.daily_streak_bonus,
            passive_income = EXCLUDED.passive_income,
            passive_amount = EXCLUDED.passive_amount,
            audit_channel_id = EXCLUDED.audit_channel_id,
            pvc_hourly_rate = EXCLUDED.pvc_hourly_rate,
            pvc_jtc_channel_id = EXCLUDED.pvc_jtc_channel_id,
            updated_at = NOW()
        `;

        await tx`
          INSERT INTO welcome_configs (
            guild_id, greet_channel_id, greet_payload, greet_enabled, leave_enabled
          ) VALUES (
            ${testGuildId}, ${testChannelId}, 'Welcome {user} to {server}! You are member #{servermember}.', true, false
          )
          ON CONFLICT (guild_id) DO UPDATE SET
            greet_channel_id = EXCLUDED.greet_channel_id,
            greet_payload = EXCLUDED.greet_payload,
            greet_enabled = EXCLUDED.greet_enabled,
            leave_enabled = EXCLUDED.leave_enabled,
            updated_at = NOW()
        `;
      });

      // Assert bot repositories reflect the unified initial server configuration
      const prefix = await getPrefix(testGuildId);
      const logChannel = await getLogChannel(testGuildId);
      const econConfig = await getEconomyConfig(testGuildId);
      const welcomeConfig = await getWelcomeConfig(testGuildId);

      assert.equal(prefix, '?');
      assert.equal(logChannel, testLogChannelId);
      assert.equal(econConfig.currencySymbol, '🪙');
      assert.equal(econConfig.startBalance, 500);
      assert.equal(econConfig.dailyRewardAmount, 1000);
      assert.equal(econConfig.passiveIncome, true);
      assert.equal(econConfig.auditChannelId, testAuditChannelId);
      assert.equal(econConfig.pvcJtcChannelId, testChannelId);
      assert.ok(welcomeConfig);
      assert.equal(welcomeConfig.greetChannelId, testChannelId);
      assert.equal(welcomeConfig.greetEnabled, true);

      // Verify dynamic welcome substitution
      const renderedGreet = substituteVariables(welcomeConfig.greetPayload || '', {
        username: 'NewMember',
        usermention: '<@1234567890>',
        usertag: 'NewMember#0001',
        useravatar: '',
        servername: 'Alpha Guild',
        servermember: 108,
        serveravatar: '',
        randomuser: '<@1234567890>',
      });
      assert.ok(renderedGreet.includes('<@1234567890>'));
      assert.ok(renderedGreet.includes('Alpha Guild'));
      assert.ok(renderedGreet.includes('108'));
    });

    // Scenario 2: Multi-Tier Role Permissions Matrix & Command Access Enforcement
    await t.test('Scenario 2: Multi-Tier Role Permissions Matrix & Real-World ACL Simulation', async () => {
      // 1. Role Policies: Moderator role -> 'moderator' profile, Junior Mod -> 'viewer' profile
      await db`
        INSERT INTO role_policies (guild_id, role_id, role_name, profile_id, member_count, status)
        VALUES
          (${testGuildId}, ${testModRoleId}, 'Moderator', 'moderator', 5, 'active'),
          (${testGuildId}, ${testJuniorModRoleId}, 'Junior Mod', 'viewer', 3, 'active')
      `;

      // 2. Custom Command ACL: Junior Mod granted role override on 'rp' (rename voice)
      const commandAcls = [
        {
          command: 'rp',
          category: 'voice',
          description: 'Rename private voice',
          defaultRoleProfile: 'viewer',
          dangerLevel: 'LOW' as const,
          roleOverrides: [{ roleId: testJuniorModRoleId, effect: 'ALLOW' as const }],
          userOverrides: [],
        },
        {
          command: 'ban',
          category: 'moderation',
          description: 'Ban member',
          defaultRoleProfile: 'moderator',
          dangerLevel: 'CRITICAL' as const,
          roleOverrides: [],
          userOverrides: [{ userId: testRogueUserId, effect: 'DENY' as const }],
        },
      ];

      // Evaluation 1: Moderator executing purge command -> ALLOWED via ROLE_PROFILE
      const modVerdict = resolveEffectiveCommandAccess({
        command: {
          name: 'purge',
          category: 'moderation',
          description: 'Purge messages',
          dangerLevel: 'HIGH',
          requiredDiscordPerm: 'Manage Messages',
        },
        userId: 'some_mod_id',
        userRoleIds: [testModRoleId],
        isOwnerOrAdmin: false,
        permits: [],
        commandAcls,
        rolePolicies: [{ roleId: testModRoleId, roleName: 'Moderator', profileId: 'moderator', memberCount: 5, status: 'active' }],
      });
      assert.equal(modVerdict.effectiveAccess, 'ALLOWED');
      assert.equal(modVerdict.source, 'ROLE_PROFILE');

      // Evaluation 2: Junior Mod executing moderation purge command -> DENIED via DEFAULT_DENY
      const juniorModVerdict = resolveEffectiveCommandAccess({
        command: {
          name: 'purge',
          category: 'moderation',
          description: 'Purge messages',
          dangerLevel: 'HIGH',
          requiredDiscordPerm: 'Manage Messages',
        },
        userId: 'some_junior_id',
        userRoleIds: [testJuniorModRoleId],
        isOwnerOrAdmin: false,
        permits: [],
        commandAcls,
        rolePolicies: [{ roleId: testJuniorModRoleId, roleName: 'Junior Mod', profileId: 'viewer', memberCount: 3, status: 'active' }],
      });
      assert.equal(juniorModVerdict.effectiveAccess, 'DENIED');

      // Evaluation 3: Junior Mod executing voice 'rp' command -> ALLOWED via ROLE_OVERRIDE
      const rpVerdict = resolveEffectiveCommandAccess({
        command: {
          name: 'rp',
          category: 'voice',
          description: 'Rename private voice',
          dangerLevel: 'LOW',
        },
        userId: 'some_junior_id',
        userRoleIds: [testJuniorModRoleId],
        isOwnerOrAdmin: false,
        permits: [],
        commandAcls,
        rolePolicies: [{ roleId: testJuniorModRoleId, roleName: 'Junior Mod', profileId: 'viewer', memberCount: 3, status: 'active' }],
      });
      assert.equal(rpVerdict.effectiveAccess, 'ALLOWED');
      assert.equal(rpVerdict.source, 'ROLE_OVERRIDE');

      // Evaluation 4: Rogue user attempting ban command -> DENIED via USER_OVERRIDE
      const rogueVerdict = resolveEffectiveCommandAccess({
        command: {
          name: 'ban',
          category: 'moderation',
          description: 'Ban member',
          dangerLevel: 'CRITICAL',
          requiredDiscordPerm: 'Ban Members',
        },
        userId: testRogueUserId,
        userRoleIds: [testModRoleId], // holds mod role, but user override DENY must win
        isOwnerOrAdmin: false,
        permits: [],
        commandAcls,
        rolePolicies: [{ roleId: testModRoleId, roleName: 'Moderator', profileId: 'moderator', memberCount: 5, status: 'active' }],
      });
      assert.equal(rogueVerdict.effectiveAccess, 'DENIED');
      assert.equal(rogueVerdict.source, 'USER_OVERRIDE');

      // Evaluation 5: Bot Owner / Server Admin Superadmin bypass -> ALLOWED
      const superadminVerdict = resolveEffectiveCommandAccess({
        command: {
          name: 'nuke',
          category: 'moderation',
          description: 'Nuke channel',
          dangerLevel: 'CRITICAL',
        },
        userId: testAdminUserId,
        userRoleIds: [],
        isOwnerOrAdmin: true,
        permits: [],
        commandAcls,
        rolePolicies: [],
      });
      assert.equal(superadminVerdict.effectiveAccess, 'ALLOWED');
      assert.equal(superadminVerdict.source, 'SUPERADMIN');
    });

    // Scenario 3: Custom Role Shop & Catalog Operations Lifecycle
    await t.test('Scenario 3: Custom Role Shop Creation, Modification & Removal Lifecycle', async () => {
      // 1. Create custom store item with 16-field schema
      const [item] = await db`
        INSERT INTO store_items (
          guild_id, name, price, description, icon_url, inventory_role_id,
          inventory_enabled, usable, sellable, stock, role_required,
          role_given, role_removed, reply_message, requirements_json, actions_json
        ) VALUES (
          ${testGuildId}, 'Gold Tier Membership', 5000, 'Grants Gold access & perks',
          'https://cdn.discordapp.com/emojis/gold.png', ${testGoldRoleId},
          true, true, true, 20, null,
          ${testGoldRoleId}, null, 'Congratulations on Gold Tier!',
          '{"min_account_age_days": 7}', '{"add_role": true}'
        )
        RETURNING item_id, name, price, stock
      `;

      const itemId = item.item_id;
      assert.equal(Number(item.price), 5000);
      assert.equal(Number(item.stock), 20);

      // 2. Admin edits price to 4500 and increases stock to 25
      await db`
        UPDATE store_items
        SET price = 4500, stock = 25
        WHERE guild_id = ${testGuildId} AND item_id = ${itemId}
      `;

      const [updatedItem] = await db`
        SELECT price, stock FROM store_items
        WHERE guild_id = ${testGuildId} AND item_id = ${itemId}
      `;
      assert.equal(Number(updatedItem.price), 4500);
      assert.equal(Number(updatedItem.stock), 25);

      // 3. Admin deletes item from catalog
      await db`
        DELETE FROM store_items
        WHERE guild_id = ${testGuildId} AND item_id = ${itemId}
      `;

      const remaining = await db`SELECT * FROM store_items WHERE guild_id = ${testGuildId} AND item_id = ${itemId}`;
      assert.equal(remaining.length, 0);
    });

    // Scenario 4: Dynamic Sticky Notices & Debounced Announcement Lifecycle
    await t.test('Scenario 4: Dynamic Sticky Notices Channel Binding, Message Refresh & Cleanup', async () => {
      const initialNotice = '📌 Welcome to the official announcements channel. Follow guidelines!';
      const initialMsgId = '999900000000000901';

      // 1. Bind sticky notice to announcement channel
      await setSticky({
        guildId: testGuildId,
        channelId: testChannelId,
        messageId: initialMsgId,
        content: initialNotice,
      });

      let sticky = await getSticky(testGuildId, testChannelId);
      assert.ok(sticky);
      assert.equal(sticky.content, initialNotice);
      assert.equal(sticky.messageId, initialMsgId);

      // 2. Simulate new messages triggering debounced reposition (new message ID generated)
      const repositionedMsgId = '999900000000000902';
      await db`
        UPDATE sticky_messages
        SET message_id = ${repositionedMsgId}, updated_at = NOW()
        WHERE guild_id = ${testGuildId} AND channel_id = ${testChannelId}
      `;

      sticky = await getSticky(testGuildId, testChannelId);
      assert.ok(sticky);
      assert.equal(sticky.messageId, repositionedMsgId);

      // 3. Delete sticky notice
      await deleteSticky(testGuildId, testChannelId);
      sticky = await getSticky(testGuildId, testChannelId);
      assert.equal(sticky, null);
    });

    // Scenario 5: Live Telemetry Inspection & Maintenance Operations
    await t.test('Scenario 5: Live Telemetry Inspection & Emergency Maintenance Mode Cycle', async () => {
      // 1. Telemetry metrics inspection
      const memUsage = process.memoryUsage();
      assert.ok(memUsage.heapUsed > 0);
      assert.ok(memUsage.heapTotal > 0);

      // 2. Activate maintenance mode
      await setMaintenanceState(true, 'Database index rebuild in progress', testAdminUserId);
      let state = await getMaintenanceState();
      assert.equal(state.enabled, true);
      assert.equal(state.reason, 'Database index rebuild in progress');
      assert.equal(state.enabledBy, testAdminUserId);

      // 3. Record emergency audit log entry
      await db`
        INSERT INTO economy_audit_log (
          guild_id, actor_id, action, amount, target_id, details
        ) VALUES (
          ${testGuildId}, ${testAdminUserId}, 'MAINTENANCE_TOGGLE', 0, 'system', 'Enabled maintenance mode'
        )
      `;

      const [audit] = await db`
        SELECT * FROM economy_audit_log
        WHERE guild_id = ${testGuildId} AND action = 'MAINTENANCE_TOGGLE'
      `;
      assert.ok(audit);
      assert.equal(audit.details, 'Enabled maintenance mode');

      // 4. Deactivate maintenance mode
      await setMaintenanceState(false, 'Maintenance complete', null);
      state = await getMaintenanceState();
      assert.equal(state.enabled, false);
    });

  } finally {
    await cleanupTestGuild(db, testGuildId);
    await db.end().catch(() => {});
    await closeDb().catch(() => {});
  }
});

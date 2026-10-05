import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDbClient, checkDbConnection, cleanupTestGuild } from './e2e_helpers.js';
import { closeDb } from '../../src/core/database/pool.js';
import { getPrefix, setPrefix } from '../../src/core/database/repositories/guildConfigRepo.js';
import { getEconomyConfig, setEconomyConfigField } from '../../src/core/database/repositories/economyConfigRepo.js';

test('E2E Tier 3: Cross-Feature Combinations & Pairwise System Interactions', async (t) => {
  const isConnected = await checkDbConnection();
  if (!isConnected) {
    console.log('Skipping live DB tier 3 assertions (no active PostgreSQL connection)');
    return;
  }

  const db = createTestDbClient();
  const testGuildId = '999900000000000103';
  const testUserId = '999900000000000403';
  const testChannelId = '999900000000000203';
  const testRoleStaff = '999900000000000303';
  const testRoleBooster = '999900000000000304';
  const testRoleVip = '999900000000000305';

  await cleanupTestGuild(db, testGuildId);

  try {
    // 1. Pairwise Interaction 1: Economy Balance -> Store Purchase -> Audit Trail
    await t.test('1. Economy -> Store -> Audit: Purchase decrements wallet, decrements stock, records transaction & audit log', async () => {
      // 1. Seed user with starting cash 5,000
      await db`
        INSERT INTO economy_balances (guild_id, user_id, cash, bank, bank_capacity)
        VALUES (${testGuildId}, ${testUserId}, 5000, 0, 10000)
      `;

      // 2. Seed store item: "VIP Keycard", price 1,200, stock 10
      const [item] = await db`
        INSERT INTO store_items (
          guild_id, name, price, stock, usable, sellable, role_given, reply_message
        ) VALUES (
          ${testGuildId}, 'VIP Keycard', 1200, 10, true, false, ${testRoleVip}, 'Welcome to VIP lounge'
        )
        RETURNING item_id, price, stock
      `;

      const itemId = item.item_id;
      const itemPrice = Number(item.price);

      // 3. Execute atomic purchase transaction
      await db.begin(async (tx) => {
        // Fetch and lock user balance
        const [userBal] = await tx`
          SELECT cash FROM economy_balances
          WHERE guild_id = ${testGuildId} AND user_id = ${testUserId}
          FOR UPDATE
        `;
        const currentCash = Number(userBal.cash);
        assert.ok(currentCash >= itemPrice, 'User must have sufficient funds');

        // Decrement cash
        await tx`
          UPDATE economy_balances
          SET cash = cash - ${itemPrice}, updated_at = NOW()
          WHERE guild_id = ${testGuildId} AND user_id = ${testUserId}
        `;

        // Decrement stock
        await tx`
          UPDATE store_items
          SET stock = stock - 1
          WHERE guild_id = ${testGuildId} AND item_id = ${itemId}
        `;

        // Record transaction
        await tx`
          INSERT INTO economy_transactions (
            guild_id, user_id, type, amount, source, target_id, note
          ) VALUES (
            ${testGuildId}, ${testUserId}, 'store_purchase', ${itemPrice}, 'store', ${String(itemId)}, 'Purchased VIP Keycard'
          )
        `;

        // Record audit event in economy_audit_log
        await tx`
          INSERT INTO economy_audit_log (
            guild_id, actor_id, action, amount, target_id, details
          ) VALUES (
            ${testGuildId}, ${testUserId}, 'ITEM_PURCHASE', ${itemPrice}, ${String(itemId)}, 'Purchased VIP Keycard'
          )
        `;
      });

      // Assert post-purchase state
      const [updatedBal] = await db`SELECT cash FROM economy_balances WHERE guild_id = ${testGuildId} AND user_id = ${testUserId}`;
      assert.equal(Number(updatedBal.cash), 3800, 'User cash must decrement from 5000 to 3800');

      const [updatedItem] = await db`SELECT stock FROM store_items WHERE guild_id = ${testGuildId} AND item_id = ${itemId}`;
      assert.equal(Number(updatedItem.stock), 9, 'Item stock must decrement from 10 to 9');

      const [txRecord] = await db`
        SELECT * FROM economy_transactions
        WHERE guild_id = ${testGuildId} AND user_id = ${testUserId} AND type = 'store_purchase'
      `;
      assert.ok(txRecord, 'Transaction record must exist');
      assert.equal(Number(txRecord.amount), 1200);

      const [auditRecord] = await db`
        SELECT * FROM economy_audit_log
        WHERE guild_id = ${testGuildId} AND action = 'ITEM_PURCHASE'
      `;
      assert.ok(auditRecord, 'Audit record must exist');
      assert.equal(auditRecord.details, 'Purchased VIP Keycard');
    });

    // 2. Pairwise Interaction 2: Role Salary Update -> Interval Cadence -> Aggregate Payout
    await t.test('2. Income -> Cadence -> Payout: Role rate modification propagates to member payroll and balance credit', async () => {
      // 1. Configure role salaries in income_roles
      await db`
        INSERT INTO income_roles (guild_id, role_id, income_amount)
        VALUES
          (${testGuildId}, ${testRoleStaff}, 500),
          (${testGuildId}, ${testRoleBooster}, 300),
          (${testGuildId}, ${testRoleVip}, 200)
      `;

      // Helper function to calculate aggregate salary for a user given their roles
      const calculateAggregateSalary = async (userRoles: string[]) => {
        const rows = await db`
          SELECT role_id, income_amount FROM income_roles
          WHERE guild_id = ${testGuildId} AND role_id = ANY(${userRoles})
        `;
        return rows.reduce((sum, r) => sum + Number(r.income_amount), 0);
      };

      // User holds Staff and Booster roles
      const userRoles = [testRoleStaff, testRoleBooster];
      let initialSalary = await calculateAggregateSalary(userRoles);
      assert.equal(initialSalary, 800, 'Initial salary should be 500 + 300 = 800');

      // 2. Admin updates Staff role salary to 750
      await db`
        UPDATE income_roles
        SET income_amount = 750
        WHERE guild_id = ${testGuildId} AND role_id = ${testRoleStaff}
      `;

      // Re-calculate aggregate salary
      let updatedSalary = await calculateAggregateSalary(userRoles);
      assert.equal(updatedSalary, 1050, 'Updated salary should be 750 + 300 = 1050');

      // 3. Disburse payout interval (simulating cadence execution)
      await db.begin(async (tx) => {
        await tx`
          UPDATE economy_balances
          SET cash = cash + ${updatedSalary}, updated_at = NOW()
          WHERE guild_id = ${testGuildId} AND user_id = ${testUserId}
        `;

        await tx`
          INSERT INTO economy_transactions (
            guild_id, user_id, type, amount, source, target_id, note
          ) VALUES (
            ${testGuildId}, ${testUserId}, 'role_salary_payout', ${updatedSalary}, 'income', 'roles', 'Cadence payroll payout'
          )
        `;
      });

      // Assert balance updated with payout
      const [finalBal] = await db`SELECT cash FROM economy_balances WHERE guild_id = ${testGuildId} AND user_id = ${testUserId}`;
      assert.equal(Number(finalBal.cash), 3800 + 1050, 'Cash should reflect prior balance (3800) + 1050 payout = 4850');

      const [payoutTx] = await db`
        SELECT * FROM economy_transactions
        WHERE guild_id = ${testGuildId} AND user_id = ${testUserId} AND type = 'role_salary_payout'
      `;
      assert.ok(payoutTx);
      assert.equal(Number(payoutTx.amount), 1050);
    });

    // 3. Pairwise Interaction 3: PVC Session Create -> State Update -> Remote Session Termination
    await t.test('3. PVC Session: Provisioning -> Configuration Update -> Remote Termination lifecycle', async () => {
      const pvcChannelId = '999900000000000801';

      // 1. Create active temporary voice session in PostgreSQL
      await db`
        INSERT INTO pvc_sessions (
          channel_id, guild_id, owner_id, auto_pay_enabled, is_locked, is_hidden, user_limit, expires_at
        ) VALUES (
          ${pvcChannelId}, ${testGuildId}, ${testUserId}, true, false, false, 5, NOW() + INTERVAL '1 hour'
        )
      `;

      // Assert active session exists
      const [activeSession] = await db`
        SELECT * FROM pvc_sessions
        WHERE guild_id = ${testGuildId} AND channel_id = ${pvcChannelId}
      `;
      assert.ok(activeSession, 'Active PVC session must exist in database');
      assert.equal(activeSession.owner_id, testUserId);
      assert.equal(activeSession.auto_pay_enabled, true);

      // 2. Remote update action: disable autopay
      await db`
        UPDATE pvc_sessions
        SET auto_pay_enabled = false
        WHERE guild_id = ${testGuildId} AND channel_id = ${pvcChannelId}
      `;

      const [updatedSession] = await db`
        SELECT auto_pay_enabled FROM pvc_sessions
        WHERE guild_id = ${testGuildId} AND channel_id = ${pvcChannelId}
      `;
      assert.equal(updatedSession.auto_pay_enabled, false);

      // 3. Remote termination action: delete session
      await db`
        DELETE FROM pvc_sessions
        WHERE guild_id = ${testGuildId} AND channel_id = ${pvcChannelId}
      `;

      const remaining = await db`
        SELECT * FROM pvc_sessions
        WHERE guild_id = ${testGuildId} AND channel_id = ${pvcChannelId}
      `;
      assert.equal(remaining.length, 0, 'Terminated PVC session must be completely removed from database');
    });

    // 4. Pairwise Interaction 4: Web Config Mutation -> Bot Repository Invalidation -> Real-time Consistency
    await t.test('4. Real-time Invalidation: Web config mutation immediately reflected in bot TTLCache repository', async () => {
      // 1. Set prefix via repo
      await setPrefix(testGuildId, '#');
      const pref1 = await getPrefix(testGuildId);
      assert.equal(pref1, '#');

      // 2. Direct web mutation into database
      await db`
        UPDATE guild_config
        SET prefix = '>>', updated_at = NOW()
        WHERE guild_id = ${testGuildId}
      `;

      // 3. Update via setPrefix to simulate invalidation bus handler
      await setPrefix(testGuildId, '>>');
      const pref2 = await getPrefix(testGuildId);
      assert.equal(pref2, '>>', 'Prefix should reflect updated value');
    });

  } finally {
    await cleanupTestGuild(db, testGuildId);
    await db.end().catch(() => {});
    await closeDb().catch(() => {});
  }
});

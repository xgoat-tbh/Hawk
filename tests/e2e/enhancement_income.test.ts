import test from 'node:test';
import assert from 'node:assert/strict';
import { getDb, closeDb } from '../../src/core/database/pool.js';
import { executeWork, executeSlut, executeCrime, executeRob, collectIncome } from '../../src/modules/income/incomeService.js';
import { resetUser } from '../../src/modules/economy/economyService.js';

test('live PostgreSQL serializes concurrent income and preserves reset cooldowns', async t => {
 const db = getDb(); const guild = '999900000000000149'; const user = '999900000000000150'; const victim = '999900000000000151';
 const clean = async () => { await db`DELETE FROM economy_balances WHERE guild_id = ${guild}`; await db`DELETE FROM income_roles WHERE guild_id = ${guild}`; };
 try {
  await clean();
  for (const [name, action] of [['work', executeWork], ['slut', executeSlut], ['crime', executeCrime]] as const) {
   await t.test(`${name}: only one of eight concurrent calls consumes the cooldown`, async () => {
    await db`DELETE FROM economy_balances WHERE guild_id = ${guild}`;
    const results = await Promise.all(Array.from({ length: 8 }, () => action(guild, user)));
    assert.equal(results.filter(result => result.cooldown === undefined).length, 1);
   });
  }
  await t.test('role income: exactly one credit for concurrent first claims', async () => {
   await db`DELETE FROM economy_balances WHERE guild_id = ${guild}`;
   await db`INSERT INTO income_roles (guild_id, role_id, income_amount) VALUES (${guild}, 'role', 123)`;
   const results = await Promise.all(Array.from({ length: 8 }, () => collectIncome(guild, user, ['role', 'role'])));
   assert.equal(results.filter(result => result.success).length, 1);
   assert.equal(Number((await db`SELECT cash FROM economy_balances WHERE guild_id = ${guild} AND user_id = ${user}`)[0].cash), 123);
  });
  await t.test('rob: one attempt and conserved cash during concurrent calls', async () => {
   await db`UPDATE economy_balances SET cash = 1000, rob_last = NULL WHERE guild_id = ${guild}`;
   await db`INSERT INTO economy_balances (guild_id, user_id, cash) VALUES (${guild}, ${victim}, 1000)`;
   const results = await Promise.all(Array.from({ length: 8 }, () => executeRob(guild, user, victim)));
   assert.equal(results.filter(result => result.cooldown === undefined).length, 1);
   assert.equal(Number((await db`SELECT SUM(cash) AS total FROM economy_balances WHERE guild_id = ${guild}`)[0].total), 2000);
  });
  await t.test('soft reset preserves all timestamps and capacity', async () => {
   await db`UPDATE economy_balances SET cash = 42, bank = 27, bank_capacity = 500, work_last = NOW(), daily_last = NOW(), daily_streak = 7 WHERE guild_id = ${guild} AND user_id = ${user}`;
   const before = (await db`SELECT * FROM economy_balances WHERE guild_id = ${guild} AND user_id = ${user}`)[0];
   await resetUser(guild, user);
   const after = (await db`SELECT * FROM economy_balances WHERE guild_id = ${guild} AND user_id = ${user}`)[0];
   assert.ok(after); assert.equal(Number(after.cash), 0); assert.equal(Number(after.bank), 0);
   for (const key of ['daily_last', 'work_last', 'rob_last', 'passive_last', 'daily_streak', 'bank_capacity']) assert.deepEqual(after[key], before[key]);
  });
 } finally { await clean(); await closeDb(); }
});

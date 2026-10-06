import test from 'node:test';
import assert from 'node:assert/strict';
import { getDb, closeDb } from '../../src/core/database/pool.js';
import { loadModule } from '../helpers/loadModule.js';
import { cleanSnowflake, cleanInt } from '../../web/app/api/guilds/[id]/config/helpers.js';

test('live schema bootstrap and partial config changes preserve stored data', async t => {
 const db = getDb(); const guild = '999900000000000152'; const channel = '123456789012345678';
 try {
  await t.test('standalone dashboard bootstrap creates missing schema in a rollback-only sandbox', async () => {
   const rollback = new Error('rollback verification schema');
   try {
    await db.begin(async tx => {
     await tx`CREATE SCHEMA hawk_enhancement_schema_check`;
     await tx`SET LOCAL search_path TO hawk_enhancement_schema_check`;
     const module = loadModule('web/lib/db.ts', { postgres: () => tx, '@/lib/env': {} }, { process: { env: { DATABASE_URL: 'postgresql://localhost/test' } } });
     await module.ensureDatabaseSchema();
     for (const table of ['suggestion_configs', 'confession_configs', 'guild_audit_logs']) assert.ok((await tx`SELECT to_regclass(${table}) AS name`)[0].name);
     const columns = (await tx`SELECT column_name FROM information_schema.columns WHERE table_schema = 'hawk_enhancement_schema_check' AND table_name = 'store_items'`).map(row => row.column_name);
     for (const field of ['icon_url', 'usable', 'sellable', 'stock', 'role_required', 'role_given', 'role_removed', 'reply_message', 'requirements_json', 'actions_json']) assert.ok(columns.includes(field));
     throw rollback;
    });
   } catch (error) { if (error !== rollback) throw error; }
   assert.equal((await db`SELECT to_regnamespace('hawk_enhancement_schema_check') AS name`)[0].name, null);
  });
  await t.test('general and PVC patches survive reload without clearing unrelated fields', async () => {
   await db`INSERT INTO guild_config (guild_id, prefix, log_channel_id) VALUES (${guild}, '!', ${channel})`;
   await db`INSERT INTO economy_config (guild_id, audit_channel_id, pvc_category_id) VALUES (${guild}, ${channel}, ${channel})`;
   const dependencies = { '@/lib/db': { db }, '../helpers': { cleanSnowflake, cleanInt } };
   const general = loadModule('web/app/api/guilds/[id]/config/handlers/general.ts', dependencies);
   const pvc = loadModule('web/app/api/guilds/[id]/config/handlers/pvc.ts', dependencies);
   await general.handleGeneral(guild, { prefix: '?' }); await pvc.handlePvc(guild, { pvc_hourly_rate: 321, auto_cleanup: false });
   assert.equal((await db`SELECT log_channel_id FROM guild_config WHERE guild_id = ${guild}`)[0].log_channel_id, channel);
   const economy = (await db`SELECT * FROM economy_config WHERE guild_id = ${guild}`)[0];
   assert.equal(economy.audit_channel_id, channel); assert.equal(economy.pvc_category_id, channel); assert.equal(economy.auto_cleanup, false);
   await pvc.handlePvc(guild, { pvc_category_id: null }); assert.equal((await db`SELECT pvc_category_id FROM economy_config WHERE guild_id = ${guild}`)[0].pvc_category_id, null);
  });
  await t.test('parking and recreating a PVC preserves paid expiry and cascades access entries', async () => {
   const rollback = new Error('rollback PVC lifecycle check');
   try {
    await db.begin(async tx => {
     const expiry = new Date(Date.now() + 3600000);
     await tx`INSERT INTO pvc_sessions (channel_id, guild_id, owner_id, expires_at, auto_pay_enabled, room_name, bitrate) VALUES ('enhancement-pvc', ${guild}, 'enhancement-owner', ${expiry}, true, 'Preserved room', 64000)`;
     await tx`INSERT INTO pvc_access (channel_id, target_id, target_type, access) VALUES ('enhancement-pvc', 'enhancement-role', 'ROLE', 'ALLOW')`;
     for (const id of ['pending-enhancement-pvc', 'recreated-enhancement-pvc']) {
      await tx`UPDATE pvc_sessions SET channel_id = ${id} WHERE guild_id = ${guild}`;
      const row = (await tx`SELECT * FROM pvc_sessions WHERE channel_id = ${id}`)[0];
      assert.equal(row.expires_at.getTime(), expiry.getTime()); assert.equal(row.room_name, 'Preserved room'); assert.equal(row.bitrate, 64000); assert.equal(row.auto_pay_enabled, true);
      assert.equal((await tx`SELECT channel_id FROM pvc_access WHERE target_id = 'enhancement-role'`)[0].channel_id, id);
     }
     throw rollback;
    });
   } catch (error) { if (error !== rollback) throw error; }
  });
  await t.test('PVC payment rolls back if rental persistence fails and commits with pending credit', async () => {
   const user = '999900000000000153';
   await db`INSERT INTO economy_balances (guild_id, user_id, cash, bank) VALUES (${guild}, ${user}, 1000, 0)`;
   try {
    const wrapped = { begin: (operation: any) => db.begin(tx => operation(async (strings: TemplateStringsArray, ...values: any[]) => {
     if (strings.join('').includes('INSERT INTO pvc_sessions')) throw new Error('Injected rental write failure');
     return tx(strings, ...values);
    })) };
    const dependencies = { '../../core/database/pool.js': { getDb: () => wrapped }, '../economy/economyService.js': { ensureBalance: async () => {} } };
    const failing = loadModule('src/modules/pvc/pvcService.ts', dependencies);
    await assert.rejects(failing.reservePvcTime(guild, user, 1, 100), /Injected rental write failure/);
    assert.equal(Number((await db`SELECT cash FROM economy_balances WHERE guild_id = ${guild} AND user_id = ${user}`)[0].cash), 1000);
    assert.equal((await db`SELECT * FROM pvc_sessions WHERE guild_id = ${guild} AND owner_id = ${user}`).length, 0);
    const service = loadModule('src/modules/pvc/pvcService.ts', { ...dependencies, '../../core/database/pool.js': { getDb: () => db } });
    const rental = await service.reservePvcTime(guild, user, 1, 100);
    assert.equal(rental.channelId, `pending-${guild}-${user}`); assert.ok(rental.expiresAt.getTime() > Date.now());
    assert.equal(Number((await db`SELECT cash FROM economy_balances WHERE guild_id = ${guild} AND user_id = ${user}`)[0].cash), 900);
   } finally { await db`DELETE FROM pvc_sessions WHERE guild_id = ${guild} AND owner_id = ${user}`; await db`DELETE FROM economy_balances WHERE guild_id = ${guild} AND user_id = ${user}`; }
  });
 } finally {
  await db`DELETE FROM guild_config WHERE guild_id = ${guild}`; await db`DELETE FROM economy_config WHERE guild_id = ${guild}`; await closeDb();
 }
});

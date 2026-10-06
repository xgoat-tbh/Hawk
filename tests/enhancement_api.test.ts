import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/loadModule.js';
import { cleanSnowflake, cleanInt } from '../web/app/api/guilds/[id]/config/helpers.js';

test('general and PVC updates preserve omitted columns and allow explicit clears', async () => {
 for (const [file, method, payload] of [['general', 'handleGeneral', { prefix: '?' }], ['pvc', 'handlePvc', { pvc_hourly_rate: 321 }]] as const) {
  const patches: any[] = [];
  const sql: any = async (value: any) => { if (!Array.isArray(value)) patches.push(value); return [{}]; }; sql.begin = (callback: any) => callback(sql);
  const handler = loadModule(`web/app/api/guilds/[id]/config/handlers/${file}.ts`, { '@/lib/db': { db: sql }, '../helpers': { cleanSnowflake, cleanInt } });
  assert.equal((await handler[method]('guild', payload)).success, true);
  assert.ok(patches.length > 0); assert.ok(patches.every(patch => !('log_channel_id' in patch) && !('audit_channel_id' in patch) && !('pvc_category_id' in patch)));
  patches.length = 0; const clearField = file === 'general' ? 'log_channel_id' : 'pvc_category_id';
  assert.equal((await handler[method]('guild', { [clearField]: null })).success, true);
  assert.ok(patches.some(patch => patch[clearField] === null));
 }
});

test('economy mutations reject malformed IDs and money, and bound finite overflow', async () => {
 let written: unknown[][] = [];
 const sql: any = async (_query: unknown, ...values: unknown[]) => { written.push(values); return []; }; sql.begin = (callback: any) => callback(sql);
 const route = loadModule('web/app/api/guilds/[id]/economy/users/route.ts', { '@/lib/auth': { getSession: async () => ({ id: '123456789012345678' }), canManageGuild: async () => true }, '@/lib/db': { db: sql } });
 const send = (body: any) => route.POST({ json: async () => body }, { params: Promise.resolve({ id: '1493322410567401722' }) });
 for (const value of ['bad', Infinity, {}, true, '']) {
  written = []; assert.equal((await send({ action: 'set_balance', userId: '123456789012345678', cash: value, bank: 0 })).status, 400); assert.equal(written.length, 0);
 }
 assert.equal((await send({ action: 'reset_user', userId: "' OR 1=1" })).status, 400);
 written = []; assert.equal((await send({ action: 'set_balance', userId: '123456789012345678', cash: 1e30, bank: -100 })).status, 200);
 assert.ok(written.flat().includes(1_000_000_000_000)); assert.ok(written.flat().includes(0));
 assert.ok(written.flat().filter(value => typeof value === 'number').every(value => Number.isSafeInteger(value)));
});

test('audit API has no client event injection endpoint', () => {
 const route = loadModule('web/app/api/guilds/[id]/audit/route.ts', { '@/lib/auth': {}, '@/lib/audit': {} });
 assert.equal(route.POST, undefined); assert.equal(typeof route.GET, 'function');
});

test('test welcome dispatch disables mentions in plain text payloads', async () => {
 let payload: any;
 const channel = '123456789012345678';
 const route = loadModule('web/app/api/guilds/[id]/test-welcome/route.ts', { '@/lib/auth': { getSession: async () => ({ id: channel, username: 'test' }), canManageGuild: async () => true }, '@/lib/discord': { fetchGuildChannels: async () => [{ id: channel }], fetchGuildDetails: async () => ({ name: 'test guild' }) }, '@/lib/env': {} }, { process: { env: { DISCORD_TOKEN: 'test-only-placeholder' } }, fetch: async (_url: unknown, init: any) => { payload = JSON.parse(init.body); return { ok: true, json: async () => ({}) }; } });
 const response = await route.POST({ json: async () => ({ channelId: channel, is_embed: false, embed: { description: '@everyone {user}' } }) }, { params: Promise.resolve({ id: '1493322410567401722' }) });
 assert.equal(response.status, 200); assert.deepEqual(payload.allowed_mentions, { parse: [] });
});

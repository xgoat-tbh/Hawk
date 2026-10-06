import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/loadModule.js';

function fixture(autoCleanup = true) {
 const session = { channelId: 'room', guildId: 'guild', ownerId: 'owner', expiresAt: new Date(Date.now() + 3600000), autoPayEnabled: true, isLocked: true, isHidden: true, userLimit: 4 };
 let deleted = 0; let cleared = 0; let parked: unknown[] = [];
 const room = { id: 'room', name: 'Custom room', bitrate: 64000, members: new Map(), isVoiceBased: () => true, delete: async () => deleted++, permissionOverwrites: { cache: new Map([['owner', { allow: { has: () => true } }]]), edit: async (_id: string, value: any) => { assert.equal(value.ManageChannels, null); cleared++; } } };
 const db = async (_sql: TemplateStringsArray, ...values: unknown[]) => { parked.push(...values); return []; };
 const guild = { id: 'guild', channels: { fetch: async () => room } };
 const module = loadModule('src/modules/pvc/pvcLifecycle.ts', { '../../core/database/pool.js': { getDb: () => db }, '../../core/database/repositories/economyConfigRepo.js': { getEconomyConfig: async () => ({ autoCleanup }) }, './pvcService.js': { getSession: async () => session, getSessionByOwner: async () => session } });
 return { module, session, room, guild, values: () => ({ deleted, cleared, parked }) };
}

test('empty PVC cleanup parks paid rental metadata instead of deleting its session', async () => {
 const f = fixture(); const expiresAt = f.session.expiresAt;
 await f.module.cleanupEmptyPvc(f.guild, 'room');
 assert.equal(f.values().deleted, 1); assert.ok(f.values().parked.includes('pending-guild-owner'));
 assert.ok(f.values().parked.includes('Custom room')); assert.ok(f.values().parked.includes(64000));
 assert.equal(f.session.expiresAt, expiresAt); assert.equal(f.session.autoPayEnabled, true);
});

test('disabled auto cleanup and occupied PVC rooms are preserved', async () => {
 const disabled = fixture(false); await disabled.module.cleanupEmptyPvc(disabled.guild, 'room'); assert.equal(disabled.values().deleted, 0);
 const occupied = fixture(); occupied.room.members.set('guest', {}); await occupied.module.cleanupEmptyPvc(occupied.guild, 'room'); assert.equal(occupied.values().deleted, 0);
});

test('legacy room owner channel-management grants are cleared without changing other overwrites', async () => {
 const f = fixture(); await f.module.stripLegacyOwnerGrant(f.room, 'owner'); assert.equal(f.values().cleared, 1);
 f.room.permissionOverwrites.cache.clear(); await f.module.stripLegacyOwnerGrant(f.room, 'owner'); assert.equal(f.values().cleared, 1);
});

test('PVC reconciliation retries transient Discord failures but ignores deleted channels', async () => {
 const db = async () => [{ guild_id: 'guild', owner_id: 'owner', channel_id: 'room' }];
 const module = loadModule('src/modules/pvc/pvcLifecycle.ts', { '../../core/database/pool.js': { getDb: () => db }, '../../core/database/repositories/economyConfigRepo.js': {}, './pvcService.js': {} });
 let code = 500;
 const guild = { id: 'guild', channels: { fetch: async () => { throw { code }; } } };
 const client = { guilds: { cache: new Map([['guild', guild]]) } };
 await assert.rejects(module.reconcilePvcPermissions(client), /incomplete/);
 code = 10003; await module.reconcilePvcPermissions(client);
});

test('PVC lifecycle operations serialize per guild and owner', async () => {
 const f = fixture(); const events: string[] = []; let release!: () => void;
 const first = f.module.withPvcOwnerLock('guild', 'owner', async () => { events.push('first'); await new Promise<void>(resolve => { release = resolve; }); events.push('done'); });
 while (!release) await new Promise(resolve => setImmediate(resolve));
 const second = f.module.withPvcOwnerLock('guild', 'owner', async () => { events.push('second'); });
 await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(events, ['first']); release(); await Promise.all([first, second]); assert.deepEqual(events, ['first', 'done', 'second']);
});

test('rejoining a parked PVC restores paid time, room metadata and access rules', async () => {
 let options: any; let purchased = 0; let moved = 0;
 const session = { channelId: 'pending-guild-owner', expiresAt: new Date(Date.now() + 3600000), roomName: 'Custom room', bitrate: 96000, isLocked: true, isHidden: true, userLimit: 4 };
 const handler = loadModule('src/modules/pvc/_pvcGatekeeper.ts', {
  '../../core/database/repositories/economyConfigRepo.js': { getEconomyConfig: async () => ({ pvcJtcChannelId: 'jtc' }) },
  './pvcService.js': { getSessionByOwner: async () => session, getAccessList: async () => [{ targetId: 'guest-role', targetType: 'ROLE', access: 'ALLOW' }] },
  './pvcLifecycle.js': { withPvcOwnerLock: async (_g: string, _u: string, fn: any) => fn(), stripLegacyOwnerGrant: async () => {} },
  '../economy/economyService.js': { deductFundsPreferCash: async () => purchased++ }, '../../core/database/pool.js': { getDb: () => async () => [{ channel_id: 'new-room' }] },
 });
 const guild = { id: 'guild', maximumBitrate: 128000, roles: { everyone: { id: 'everyone' } }, channels: { create: async (value: any) => { options = value; return { id: 'new-room' }; } } };
 await handler.handlePvcVoiceStateUpdate({ channelId: null }, { guild, channelId: 'jtc', member: { id: 'owner', user: { username: 'Owner' }, voice: { setChannel: async () => moved++ } } });
 assert.equal(purchased, 0); assert.equal(moved, 1); assert.equal(options.name, 'Custom room'); assert.equal(options.bitrate, 96000); assert.equal(options.userLimit, 4);
 assert.ok(options.permissionOverwrites.find((entry: any) => entry.id === 'guest-role' && entry.type === 0).allow.length > 0);
 assert.equal(options.permissionOverwrites.find((entry: any) => entry.id === 'everyone').deny.length, 2);
});

test('Discord creation failures retain the purchased pending rental and retries do not charge twice', async () => {
 let session: any = null; let charged = 0; let fails = true;
 const handler = loadModule('src/modules/pvc/_pvcGatekeeper.ts', {
  '../../core/database/repositories/economyConfigRepo.js': { getEconomyConfig: async () => ({ pvcJtcChannelId: 'jtc', pvcHourlyRate: 100 }) },
  './pvcService.js': { getSessionByOwner: async () => session, reservePvcTime: async () => { charged++; session = { channelId: 'pending-guild-owner', expiresAt: new Date(Date.now() + 3600000) }; return session; }, getAccessList: async () => [] },
  './pvcLifecycle.js': { withPvcOwnerLock: async (_g: string, _u: string, fn: any) => fn(), stripLegacyOwnerGrant: async () => {} },
  '../../core/database/pool.js': { getDb: () => async () => [{ channel_id: 'created' }] },
 });
 const guild = { id: 'guild', roles: { everyone: { id: 'everyone' } }, channels: { create: async () => { if (fails) throw new Error('Discord unavailable'); return { id: 'created' }; } } };
 const event = { guild, channelId: 'jtc', member: { id: 'owner', user: { username: 'Owner' }, voice: { setChannel: async () => {} } } };
 await assert.rejects(handler.handlePvcVoiceStateUpdate({ channelId: null }, event), /Discord unavailable/);
 assert.ok(session); assert.equal(charged, 1);
 fails = false; await handler.handlePvcVoiceStateUpdate({ channelId: null }, event); assert.equal(charged, 1);
});

test('failed database attachment removes the newly created orphan while retaining pending credit', async () => {
 let removed = 0;
 const handler = loadModule('src/modules/pvc/_pvcGatekeeper.ts', {
  '../../core/database/repositories/economyConfigRepo.js': { getEconomyConfig: async () => ({ pvcJtcChannelId: 'jtc' }) },
  './pvcService.js': { getSessionByOwner: async () => ({ channelId: 'pending-guild-owner', expiresAt: new Date(Date.now() + 3600000) }), getAccessList: async () => [] },
  './pvcLifecycle.js': { withPvcOwnerLock: async (_g: string, _u: string, fn: any) => fn() }, '../../core/database/pool.js': { getDb: () => async () => { throw new Error('DB attachment failed'); } },
 });
 const guild = { id: 'guild', roles: { everyone: { id: 'everyone' } }, channels: { create: async () => ({ id: 'created', delete: async () => removed++ }) } };
 await assert.rejects(handler.handlePvcVoiceStateUpdate({ channelId: null }, { guild, channelId: 'jtc', member: { id: 'owner', user: { username: 'Owner' } } }), /DB attachment failed/); assert.equal(removed, 1);
});

test('PVC scheduler rereads rentals inside the owner lock instead of using stale channel snapshots', async () => {
 const old = { channelId: 'old-room', guildId: 'guild', ownerId: 'owner' };
 let locked = false; let paid = 0; let deleted: string | null = null;
 const current = { ...old, channelId: 'pending-guild-owner', autoPayEnabled: true, expiresAt: new Date(Date.now() + 60000) };
 const scheduler = loadModule('src/modules/pvc/pvcScheduler.ts', {
  './pvcLocks.js': { withPvcOwnerLock: async (_g: string, _u: string, fn: any) => { locked = true; try { return await fn(); } finally { locked = false; } } },
  './pvcService.js': { getExpiringSessionsForAutoPay: async () => [old], getSessionsExpiringWithin: async () => [], getExpiredSessions: async () => [old], getSessionByOwner: async () => { assert.equal(locked, true); return current; }, reservePvcTime: async () => { assert.equal(locked, true); paid++; current.expiresAt = new Date(Date.now() + 3600000); }, deleteSession: async (id: string) => { deleted = id; } },
  '../../core/database/repositories/economyConfigRepo.js': { getEconomyConfig: async () => ({ pvcHourlyRate: 100 }) },
 });
 await scheduler.checkPvcExpirations({ guilds: { cache: new Map() } }); assert.equal(paid, 1); assert.equal(deleted, null);
});

test('PVC scheduler starts even if initial legacy-permission reconciliation fails', async () => {
 let started = 0; let retried = 0;
 const module = loadModule('src/modules/pvc/_module.ts', {
  './pvcLifecycle.js': { reconcilePvcPermissions: async () => { throw new Error('Database temporarily unavailable'); } },
  './pvcScheduler.js': { startPvcScheduler: () => { started++; return {}; }, stopPvcScheduler() {} },
 }, { setInterval: () => { retried++; return { unref() {} }; }, clearInterval() {}, console: { warn() {} } });
 await module.default.onReady({}); assert.equal(started, 1); assert.equal(retried, 1); await module.default.onShutdown();
});

test('disconnecting with no configured JTC never creates a PVC or charges the member', async () => {
 let charges = 0; let cleaned = 0;
 const handler = loadModule('src/modules/pvc/_pvcGatekeeper.ts', {
  '../../core/database/repositories/economyConfigRepo.js': { getEconomyConfig: async () => ({ pvcJtcChannelId: null, pvcHourlyRate: 100 }) },
  './pvcService.js': { getSessionByOwner: async () => null },
  './pvcLifecycle.js': { withPvcOwnerLock: async (_g: string, _u: string, fn: any) => fn(), cleanupEmptyPvc: async () => cleaned++ },
  '../economy/economyService.js': { deductFundsPreferCash: async () => { charges++; return { deductedFromCash: 100, deductedFromBank: 0 }; } },
 });
 await handler.handlePvcVoiceStateUpdate({ channelId: 'ordinary-room' }, { guild: { id: 'guild' }, channelId: null, member: { id: 'owner' } });
 assert.equal(charges, 0); assert.equal(cleaned, 1);
});

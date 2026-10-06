import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { loadModule } from './helpers/loadModule.js';
import { SlidingWindowLimiter } from '../web/lib/rateLimit.js';
import { validateOrigin, validateCsrf } from '../web/lib/csrf.js';

const guild = '1493322410567401722';
const otherGuild = '1517584175677308998';
const user = '123456789012345678';
const csrf = 'a'.repeat(64);

test('guild override replacement never reads or writes global dashboard access', async () => {
  const statements: { sql: string; values: unknown[] }[] = [];
  const tx: any = async (sql: TemplateStringsArray, ...values: unknown[]) => { statements.push({ sql: sql.join('?'), values }); return sql.join('').includes('SELECT') ? [{ user_id: '987654321098765432' }] : []; };
  tx.begin = (fn: any) => fn(tx);
  const route = loadModule('web/app/api/guilds/[id]/permissions/route.ts', {
    '@/lib/auth': { getSession: async () => ({ id: user }), canManageGuild: async () => true, isGuildOwner: async () => true },
    '@/lib/db': { db: tx, ensureDatabaseSchema: async () => {} }, '@/lib/audit': { logAuditEvent: async () => {} }, '@/lib/permissions': {}, '@/lib/commands': {}, '@/lib/permissionsService': { fetchGuildPermissions: async () => ({}) },
  });
  const result = await route.POST({ json: async () => ({ action: 'save_user_overrides', data: { userOverrides: [{ userId: user, module: 'general', action: 'view', effect: 'ALLOW' }] } }) }, { params: Promise.resolve({ id: guild }) });
  assert.equal(result.status, 200);
  assert.ok(statements.length > 0);
  assert.ok(statements.every(row => !row.sql.includes('dashboard_access')));
  assert.ok(statements.filter(row => row.sql.includes('user_overrides')).every(row => row.values.includes(guild)));
});

test('Discord ownership and admin permissions grant access only within their guild', async () => {
  const auth = loadModule('web/lib/auth.ts', {
    'next/headers': {}, './guilds': { supportedGuildIds: [guild, otherGuild] }, './db': { db: async () => [] },
    './discord': { fetchGuildDetails: async (id: string) => ({ owner_id: id === guild ? 'owner' : 'other-owner' }), fetchGuildMember: async (id: string, idUser: string) => ({ roles: [], permissions: id === guild && idUser === 'admin' ? '8' : id === guild && idUser === 'manager' ? '32' : '0' }), fetchGuildRoles: async () => [] },
  });
  assert.equal(await auth.getAccessLevel('owner', guild), 'owner');
  assert.equal(await auth.getAccessLevel('owner', otherGuild), 'none');
  assert.equal(await auth.getAccessLevel('admin', guild), 'editor');
  assert.equal(await auth.getAccessLevel('admin', otherGuild), 'none');
  assert.equal(await auth.getAccessLevel('manager', guild), 'editor');
});

test('mutation origins must match exact scheme, hostname and port, even with a forged Host', () => {
  assert.equal(validateOrigin(null, 'https://hawk.test'), false);
  assert.equal(validateOrigin('https://evil.test', 'https://hawk.test', 'evil.test'), false);
  assert.equal(validateOrigin('http://localhost:3001', 'http://localhost:3000', 'localhost:3001'), false);
  assert.equal(validateOrigin('http://localhost.evil.test', 'http://localhost:3000', 'localhost.evil.test'), false);
  assert.equal(validateOrigin('https://hawk.test', 'https://hawk.test'), true);
});

function middleware() {
  return loadModule('web/middleware.ts', { '@/lib/auth': { getSessionFromToken: async () => null }, '@/lib/clientIp': { clientIp: () => null }, '@/lib/csrf': { validateOrigin, validateCsrf, CSRF_COOKIE: 'hawk_csrf' }, '@/lib/rateLimit': { rateLimiter: new SlidingWindowLimiter() } }).middleware;
}
function otpRequest(id = user, secure = true) {
  return new NextRequest('http://localhost:3000/api/auth/otp/request', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000', ...(secure ? { Cookie: `hawk_csrf=${csrf}`, 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ userId: id }) });
}
test('health endpoint is available without a session', async () => {
  assert.equal((await middleware()(new NextRequest('http://localhost:3000/api/health'))).status, 200);
});
test('both OTP endpoints reject missing CSRF before permitting the handler', async () => {
  const guard = middleware();
  assert.equal((await guard(otpRequest(user, false))).status, 403);
  const verify = new NextRequest('http://localhost:3000/api/auth/otp/verify', { method: 'POST', headers: { Origin: 'http://localhost:3000' }, body: JSON.stringify({ userId: user, otp: '123456' }) });
  assert.equal((await guard(verify)).status, 403);
});
test('unknown peer login attempts are limited per account without locking out another account', async () => {
  const guard = middleware();
  for (let index = 0; index < 5; index++) assert.equal((await guard(otpRequest())).status, 200);
  assert.equal((await guard(otpRequest())).status, 429);
  assert.equal((await guard(otpRequest('987654321098765432'))).status, 200);
});

test('OTP database stores a SHA-256 digest while DM delivery receives the original code', async () => {
  let stored: unknown; let delivered = '';
  const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
    if (strings.join('').includes('INSERT INTO dashboard_otps')) { stored = values[1]; return [{ user_id: user }]; }
    return [];
  };
  const route = loadModule('web/app/api/auth/otp/request/route.ts', { '@/lib/env': {}, '@/lib/db': { db: sql }, '@/lib/auth': { canLogin: async () => true, ensureAuthTables: async () => {} }, '@/lib/discord': { sendDirectMessage: async (_id: string, content: string) => { delivered = content; return { success: true }; } } });
  const result = await route.POST({ json: async () => ({ userId: user }) });
  assert.equal(result.status, 200);
  const code = delivered.match(/\*\*(\d{6})\*\*/)?.[1];
  assert.ok(code);
  assert.equal(stored, crypto.createHash('sha256').update(code).digest('hex'));
  assert.notEqual(stored, code);
});
test('OTP verification compares digests and consumes a matching code exactly once', async () => {
  let consumed = false;
  const tx: any = async (strings: TemplateStringsArray) => {
    const query = strings.join('');
    if (query.includes('SELECT')) return consumed ? [] : [{ otp_code: crypto.createHash('sha256').update('123456').digest('hex'), attempts: 0, expires_at: new Date(Date.now() + 120000) }];
    if (query.includes('DELETE')) consumed = true;
    return [];
  }; tx.begin = (fn: any) => fn(tx);
  const route = loadModule('web/app/api/auth/otp/verify/route.ts', { '@/lib/env': {}, '@/lib/db': { db: tx }, '@/lib/auth': { createSession: async () => 'b'.repeat(64), canLogin: async () => true, isBotOwner: () => false, isBotAdmin: () => false, ensureAuthTables: async () => {}, COOKIE_NAME: 'hawk_session', sessionDurationHours: () => 24 }, '@/lib/discord': { fetchDiscordUser: async () => ({ username: 'test' }) } });
  const request = () => new NextRequest('http://localhost:3000/api/auth/otp/verify', { method: 'POST', body: JSON.stringify({ userId: user, otp: '123456' }) });
  assert.equal((await route.POST(request())).status, 200);
  assert.equal((await route.POST(request())).status, 400);
});

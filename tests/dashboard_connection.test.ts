import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import 'dotenv/config';
import postgres from 'postgres';
import { botConnection } from '../src/core/web/botConnection.js';
import { botConnection as dashboardBotConnection } from '../web/lib/botConnection.js';

const require = createRequire(import.meta.url);
test('overview statistics execute against the bot telemetry schema', async () => {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, connect_timeout: 10 });
  const source = readFileSync(new URL('../web/app/api/guilds/[id]/stats/route.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports: Record<string, any> = {};
  const errors: unknown[] = [];
  const queryFailures: string[] = [];
  const routeDb = (strings: TemplateStringsArray, ...values: any[]) => {
    const query = db(strings, ...values);
    return strings.join(' ').includes('command_telemetry') ? query.catch(error => { queryFailures.push(error.message); throw error; }) : query;
  };
  const dependencies: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (body: unknown, init?: { status: number }) => ({ body, status: init?.status || 200 }) } },
    '@/lib/auth': { getSession: async () => ({ id: 'test' }), canViewGuild: async () => true },
    '@/lib/discord': { fetchBotGuilds: async () => [], fetchGuildDetails: async () => ({ approximate_member_count: 7 }) },
    '@/lib/db': { db: routeDb, ensureDatabaseSchema: async () => {} },
    '../../../../../../src/core/web/botConnection': { botConnection },
    '@/lib/botConnection': { botConnection: dashboardBotConnection },
  };
  vm.runInNewContext(code, { exports, require: (name: string) => dependencies[name] || require(name), process, console: { error: (...args: unknown[]) => errors.push(args) }, hawkClient: { ws: { ping: 25 }, isReady: () => true, guilds: { cache: new Map() } }, Date });
  try {
    const result = await exports.GET({}, { params: Promise.resolve({ id: '999999999999999996' }) });
    assert.equal(result.status, 200, JSON.stringify(errors));
    assert.equal(result.body.activityChart.length, 24);
    assert.equal(result.body.memberCount, 7);
    assert.deepEqual(queryFailures, [], 'Telemetry queries must not hide schema errors behind zero counts.');
  } finally { await db.end(); }
});

test('connection status never reports REST latency or a stale guild as a ready gateway', async () => {
  const { botConnection } = await import('../src/core/web/botConnection.js');
  const client = { isReady: () => false, ws: { ping: -1 }, guilds: { cache: new Map([['g', {}]]) } };
  assert.deepEqual(botConnection(client, 'g'), { status: 'disconnected', botReady: false, guildAvailable: true, gatewayLatencyMs: null });
  client.isReady = () => true;
  client.ws.ping = 25;
  assert.deepEqual(botConnection(client, 'g'), { status: 'connected', botReady: true, guildAvailable: true, gatewayLatencyMs: 25 });
  assert.equal(botConnection(client, 'missing').status, 'guild-unavailable');
  assert.equal(botConnection(undefined, 'g').status, 'unavailable');
  for (const reportConnection of [botConnection, dashboardBotConnection]) {
    const unavailableGuild = { isReady: () => true, ws: { ping: 25 }, guilds: { cache: new Map([['g', { available: false }]]) } };
    assert.equal(reportConnection(unavailableGuild, 'g').status, 'guild-unavailable');
    assert.equal(reportConnection(unavailableGuild, 'g').gatewayLatencyMs, null);
  }
});

test('integrated server builds responsive dashboard CSS from the repository root', async () => {
  const { default: configuration } = await import('../web/postcss.config.mjs');
  const postcss = require('postcss');
  const plugins = Object.entries(configuration.plugins).map(([name, options]) => require(name)(options));
  const result = await postcss(plugins).process('@tailwind utilities;', { from: new URL('../web/styles/globals.css', import.meta.url).pathname });
  assert.ok(result.css.includes('.sm\\:flex-row'), 'The desktop layout breakpoint must be generated for dashboard source files.');
});

test('production entry selects secure server mode before loading the bot', async () => {
  const entry = new URL('../src/start.ts', import.meta.url);
  const source = existsSync(entry) ? readFileSync(entry, 'utf8') : '';
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const environment: Record<string, string> = {};
  let observedMode: string | undefined;
  const execute = async (built: boolean) => vm.runInNewContext(`(async () => {${code}})()`, {
    exports: {}, process: { env: environment },
    require: (name: string) => name.includes('node:fs') ? { existsSync: () => built } : (observedMode = environment.NODE_ENV, {}),
  });
  await execute(true);
  assert.equal(observedMode, 'production');
  observedMode = undefined;
  await assert.rejects(execute(false), /npm run build/);
  assert.equal(observedMode, undefined, 'The bot must not start without its production dashboard build.');
});

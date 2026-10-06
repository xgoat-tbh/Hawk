import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { validateFlow, scriptToFlow, flowToScript } from '../src/core/commands/customCommandFlow.js';
const require = createRequire(import.meta.url);
function load(file: string, dependencies: Record<string, unknown>, env = {}) {
 const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8'); const exports: Record<string, any> = {};
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, { exports, process: { env }, console, require: (key: string) => key in dependencies ? dependencies[key] : require(key) }); return exports;
}
test('Discord administrator and explicit allowlist members can edit within supported guilds', async () => {
 const guild = '1493322410567401722';
 const auth = load('web/lib/auth.ts', { 'next/headers': {}, './guilds': { supportedGuildIds: [guild] }, './db': { db: async (_query: unknown, user: string) => user === 'editor' ? [{ user_id: user }] : [] }, './discord': { fetchGuildDetails: async () => ({ owner_id: 'guild-owner' }), fetchGuildMember: async () => ({ roles: ['r'] }), fetchGuildRoles: async () => [{ id: 'r', permissions: '8' }] } });
 assert.equal(await auth.getAccessLevel('viewer',guild),'editor'); assert.equal(await auth.canViewGuild('viewer',guild),true); assert.equal(await auth.canManageGuild('viewer',guild),true); assert.equal(await auth.getAccessLevel('editor',guild),'editor'); assert.equal(await auth.canManageGuild('editor',guild),true);
 const perms = await auth.getUserModulePermissions('viewer',guild); assert.ok(Object.values(perms.modules).every((p: any) => p.view && p.manage)); assert.equal(await auth.getAccessLevel('editor','123456789012345678'),'none');
});
test('config POST independently rejects viewers before database writes', async () => {
 let writes = 0; const route = load('web/app/api/guilds/[id]/config/route.ts', { '@/lib/auth': { getSession: async () => ({ id: 'viewer' }), canManageGuild: async () => false }, '@/lib/db': { ensureDatabaseSchema: async () => writes++, db: async () => writes++ }, '@/lib/auditLogger': {}, './helpers': {}, './dispatcher': { handleConfigModule: async () => writes++ } });
 const response = await route.POST({}, { params: Promise.resolve({ id: '1493322410567401722' }) }); assert.equal(response.status,403); assert.equal(writes,0);
});
test('community clearing writes NULL and preserves an omitted configuration section', async () => {
 const statements: string[] = []; const route = load('web/app/api/guilds/[id]/config/handlers/community.ts', { '@/lib/db': { db: async (sql: TemplateStringsArray) => { statements.push(sql.join('?')); } }, '../helpers': { cleanSnowflake: (v: unknown) => typeof v === 'string' && /^\d{17,20}$/.test(v) ? v : null } });
 await route.handleCommunity('guild', { suggestion: { submission_channel_id: null } }); assert.equal(statements.length,1); assert.match(statements[0], /suggestion_configs SET channel_id = NULL/);
 statements.length = 0; await route.handleCommunity('guild', { confession: { submission_channel_id: null, log_channel_id: null } }); assert.equal(statements.length,1); assert.match(statements[0], /confession_configs SET channel_id = NULL/);
});
test('changing income cadence preserves omitted economy fields', async () => {
 const patches: any[] = []; const sql: any = async (value: any) => { if (!Array.isArray(value)) patches.push(value); return [{ income_reset: '12h', currency_symbol: '€', daily_reward_amount: 777 }]; }; sql.begin = async (callback: any) => callback(sql);
 const route = load('web/app/api/guilds/[id]/config/handlers/economy.ts', { '@/lib/db': { db: sql }, '../helpers': { cleanString: (s: any) => String(s || ''), cleanInt: (v: any, _min: any, _max: any, fallback: any) => v === undefined ? fallback : Number(v) } });
 const result = await route.handleEconomy('guild', { income_reset: '12h' });
 assert.equal(result.success, true); assert.ok(patches.some(p => p.income_reset === '12h')); assert.ok(patches.every(p => !('currency_symbol' in p) && !('daily_reward_amount' in p)));
});
test('sticky rejects a channel outside the authorized guild before Discord writes', async () => {
 let sends = 0;
 const route = load('web/app/api/guilds/[id]/config/handlers/sticky.ts', { '@/lib/db': { db: async () => [] }, '@/lib/discord': { fetchGuildChannels: async () => [{ id: '123456789012345678', type: 0 }], sendChannelMessage: async () => sends++, deleteChannelMessage: async () => sends++ }, '../helpers': { cleanSnowflake: (v: string) => v, cleanString: (v: string) => v } });
 const result = await route.handleSticky('guild', 'sticky_add', { channel_id: '987654321098765432', content: 'hello' }); assert.equal(result.success, false); assert.equal(sends, 0);
});
test('visual command saves keep node positions and audit in the same transaction', async () => {
 let savedFlow: any; let auditSql: any;
 const sql: any = async (query: TemplateStringsArray) => query.join('').includes('COUNT') ? [{ count: 0 }] : [{ id: 1 }]; sql.json = (flow: any) => { savedFlow = flow; return JSON.stringify(flow); }; sql.begin = async (cb: any) => cb(sql);
 const route = load('web/app/api/guilds/[id]/commands/route.ts', { '@/lib/auth': { getSession: async () => ({ id: 'editor' }), canManageGuild: async () => true }, '@/lib/db': { db: sql }, '@/lib/commandFlow': { validateFlow, scriptToFlow, flowToScript }, '../config/helpers': { cleanSnowflakeArray: () => [] }, '@/lib/auditLogger': { logDashboardAction: async (_params: any, tx: any) => { auditSql = tx; } }, '@/lib/commands': { BUILT_IN_COMMANDS: [] } });
 const flow = { nodes: [{ id: 't', type: 'hawk', position: { x: 827, y: 349 }, data: { action: 'trigger', args: {} } }], edges: [] };
 const response = await route.POST({ json: async () => ({ name: 'test-layout', flow_json: flow, script_text: flowToScript(flow as any) }) }, { params: Promise.resolve({ id: '1493322410567401722' }) });
 assert.equal(response.status, 200); assert.deepEqual(savedFlow.nodes[0].position, flow.nodes[0].position); assert.equal(auditSql, sql);
});
test('game config rejects invalid cooldowns before any writes', async () => {
 let writes = 0;
 const route = load('web/app/api/guilds/[id]/games/config/route.ts', { '@/lib/auth': { getSession: async () => ({ id: 'editor' }), canManageGuild: async () => true }, '@/lib/db': { db: () => writes++ } });
 const response = await route.POST({ json: async () => ({ coinflip: -1 }) }, { params: Promise.resolve({ id: '1493322410567401722' }) }); assert.equal(response.status, 400); assert.equal(writes, 0);
});
test('role income collection honors the configured payout interval', async () => {
 let paid = 0;
 const sql: any = async (query: any) => !Array.isArray(query) ? query : query.join('').includes('FOR UPDATE') ? [{ user_id: 'u', cash: 0, passive_last: new Date(Date.now() - 13 * 3600000) }] : query.join('').includes('SELECT role_id') ? [{ role_id: 'r', income_amount: 50 }] : query.join('').includes('SET cash') ? (paid++, []) : []; sql.begin = (fn: any) => fn(sql);
 const service = load('src/modules/income/incomeService.ts', { '../../core/database/pool.js': { getDb: () => sql }, '../../core/database/repositories/economyConfigRepo.js': { getEconomyConfig: async () => ({ incomeReset: '12h', startBalance: 0 }) }, '../economy/economyService.js': {}, '../../core/utils/incomeInterval.js': { incomeIntervalSeconds: () => 43200 } });
 const result = await service.collectIncome('g', 'u', ['r']); assert.equal(result.success, true); assert.equal(paid, 1);
});

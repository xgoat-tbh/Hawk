import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function command(file: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(new URL(`../src/modules/${file}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: Record<string, any> = {};
  vm.runInNewContext(code, { exports, require: (name: string) => name.includes('types/command') ? { defineCommand: (v: unknown) => v } : dependencies, console });
  return exports.default;
}

test('economy reset rejects an incorrect confirmation without wiping or auditing', async () => {
  let writes = 0;
  const cmd = command('economy/reset-economy', { resetEconomy: async () => writes++, logAuditAction: async () => writes++ });
  await cmd.execute({ parsed: { args: ['wrong'] }, guild: { id: 'g', name: 'Main Server' }, message: { author: { id: 'u' } }, respond: { error: async () => {}, success: async () => {} } });
  assert.equal(writes, 0);
});

test('a member cannot reset another member balance without ManageGuild', async () => {
  let writes = 0;
  const cmd = command('economy/reset-money', { resetUser: async () => writes++, logAuditAction: async () => writes++ });
  await cmd.execute({ parsed: { tokens: [{ type: 'mention_user', value: 'other' }] }, member: { permissions: { has: () => false } }, guild: { id: 'g' }, message: { author: { id: 'u' } }, respond: { error: async () => {}, success: async () => {} } });
  assert.equal(writes, 0);
});

test('store purchases pass the actual member to the role requirement guard', async () => {
  const member = { roles: { add: async () => {} } };
  let supplied: unknown;
  const cmd = command('store/buy-item', { getItem: async () => ({ itemId: 1, price: 2, name: 'VIP' }), ensureBalance: async () => {}, getEconomyConfig: async () => null, buyItem: async (...args: unknown[]) => { supplied = args[4]; } });
  await cmd.execute({ parsed: { args: ['VIP'] }, member, guild: { id: 'g' }, message: { author: { id: 'u' } }, respond: { error: async () => {}, success: async () => {} } });
  assert.equal(supplied, member);
});

test('income reset writes the supported repository field and surfaces failures', async () => {
  let field: string | undefined;
  const cmd = command('economy/set-income-reset', { setEconomyConfigField: async (_id: string, key: string) => { field = key; throw new Error('database unavailable'); } });
  await assert.rejects(cmd.execute({ parsed: { args: ['60'] }, guild: { id: 'g' }, respond: { success: async () => {} } }), /database unavailable/);
  assert.equal(field, 'incomeReset');
});

test('unauthenticated development login endpoint does not exist', () => {
  assert.equal(existsSync(new URL('../web/app/api/auth/dev-login/route.ts', import.meta.url)), false);
});

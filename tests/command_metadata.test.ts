import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { BUILT_IN_COMMANDS, BOT_COMMAND_CATALOG, resolveBuiltInCommand } from '../web/lib/commands.js';
test('dashboard command metadata is current and resolves real canonical names/modules', () => {
 execFileSync(process.execPath, ['scripts/generate_command_registry.mjs', '--check']);
 assert.equal(resolveBuiltInCommand('bal')?.name, 'balance');
 assert.equal(resolveBuiltInCommand('buy')?.name, 'buy-item');
 assert.equal(resolveBuiltInCommand('buy')?.module, 'store');
 assert.equal(resolveBuiltInCommand('sticky')?.module, 'sticky');
 assert.ok(BUILT_IN_COMMANDS.some(c => c.name === 'role')); assert.ok(BUILT_IN_COMMANDS.some(c => c.name === 'collect'));
 assert.ok(BUILT_IN_COMMANDS.some(c => c.module === 'owner')); assert.ok(BOT_COMMAND_CATALOG.every(c => c.category !== 'owner'));
});

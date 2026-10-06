import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/loadModule.js';

test('Mines initial inactivity timer prunes the registered session and pays winnings once', async () => {
 let timeout!: () => Promise<void>; let paid = 0;
 const handler = loadModule('src/modules/games/_minesHandler.ts', { '../economy/economyService.js': { addCash: async (_g: string, _u: string, amount: number) => { paid += amount; } }, '../../core/database/repositories/transactionRepo.js': { logTransaction: async () => {} } }, { setTimeout: (fn: any, ms: number) => { if (ms === 300000) timeout = fn; return { unref() {} }; }, clearTimeout: () => {} });
 const command = loadModule('src/modules/games/mines.ts', { '../../core/database/repositories/economyConfigRepo.js': { getEconomyConfig: async () => ({ minBet: 1, maxBet: 1000, currencySymbol: '$' }) }, '../../types/command.js': { defineCommand: (value: any) => value }, '../economy/economyService.js': { deductCash: async () => {} }, '../../core/database/repositories/gameCooldownRepo.js': { getGameSettings: async () => ({ enabled: true, cooldown: 0 }) }, '../../core/utils/gameBet.js': { validGameBet: () => true }, './_minesHandler.js': handler }, { setTimeout: (fn: any) => { timeout = fn; return {}; } });
 let gameId = '';
 await command.default.execute({ guild: { id: 'guild' }, member: { id: 'user' }, parsed: { args: ['100', '1'] }, respond: {}, channel: { send: async (payload: any) => { gameId = payload.components[0].components[0].data.custom_id.split(':')[2]; } } });
 const session = handler.getMinesSession(gameId); assert.ok(session); session.revealedGems.add(1); session.currentMultiplier = 1.41;
 await timeout(); assert.equal(paid, 141); assert.equal(handler.getMinesSession(gameId), undefined);
 await timeout(); assert.equal(paid, 141);
});

test('both voice approval handlers reject destination permission failures before moving', async () => {
 for (const name of ['dragme', 'rmv']) {
  let moved = 0; let response = '';
  const request = { requesterId: 'requester', targetId: 'target' };
  const dest = { id: 'destination', permissionsFor: () => ({ has: () => false }) };
  const requester = { voice: { channelId: 'a', channel: name === 'rmv' ? dest : {}, setChannel: async () => moved++ } };
  const target = { voice: { channelId: 'b', channel: name === 'dragme' ? dest : {}, setChannel: async () => moved++ } };
  const handler = loadModule(`src/modules/voice/_${name}Handler.ts`, { '../../core/interactions/InteractionState.js': { getStateAnyUser: () => request, deleteState() {} }, '../../core/utils/formatters.js': { mentionUser: (id: string) => id }, '../../core/logging/ConsoleLogger.js': {}, '../../core/logging/WebhookLogger.js': {} });
  await handler[name === 'rmv' ? 'handleRmvInteraction' : 'handleDragmeInteraction']({ customId: `${name}_approve_message`, user: { id: 'target' }, guild: { members: { fetch: async (id: string) => id === 'target' ? target : requester, me: { permissions: { has: () => true } } } }, reply: async (payload: any) => { response = payload.content; } });
  assert.equal(moved, 0); assert.match(response, /permission|access|connect/i);
 }
});

test('Mines rejects forged initial cashout and invalid tiles, and prunes unplayed timeouts', async () => {
 let paid = 0; let reply = '';
 const handler = loadModule('src/modules/games/_minesHandler.ts', { '../economy/economyService.js': { addCash: async () => paid++ }, '../../core/database/repositories/transactionRepo.js': { logTransaction: async () => {} }, '../../core/logging/ConsoleLogger.js': { consoleLog() {} } }, { setTimeout: () => ({ unref() {} }), clearTimeout() {} });
 const session = { gameId: 'game', guildId: 'guild', userId: 'user', betAmount: 100, mineCount: 1, minePositions: new Set([0]), revealedGems: new Set(), currentMultiplier: 1.06, active: true, timeoutTimer: null };
 handler.registerMinesSession(session);
 const click = (customId: string) => handler.handleMinesButton({ customId, user: { id: 'user' }, reply: async (value: any) => { reply = value.content; } });
 await click('mines:cashout:game'); assert.match(reply, /Reveal a gem/); assert.equal(paid, 0);
 await click('mines:tile:game:99'); assert.match(reply, /Invalid/); assert.equal(session.revealedGems.size, 0);
 await handler.expireMinesSession(session); assert.equal(paid, 0); assert.equal(handler.getMinesSession('game'), undefined);
});

test('Mines timeout payout failure retains the session for retry', async () => {
 let failed = true; let retries = 0; let paid = 0;
 const handler = loadModule('src/modules/games/_minesHandler.ts', { '../economy/economyService.js': { addCash: async (_g: string, _u: string, amount: number) => { if (failed) throw new Error('temporary database failure'); paid += amount; } }, '../../core/database/repositories/transactionRepo.js': { logTransaction: async () => {} }, '../../core/logging/ConsoleLogger.js': { consoleLog() {} } }, { setTimeout: (_fn: any, ms: number) => { if (ms === 30000) retries++; return { unref() {} }; }, clearTimeout() {} });
 const session = { gameId: 'retry', guildId: 'guild', userId: 'user', betAmount: 100, mineCount: 1, minePositions: new Set([0]), revealedGems: new Set([1]), currentMultiplier: 1.41, active: true, timeoutTimer: null };
 handler.registerMinesSession(session); await handler.expireMinesSession(session);
 assert.equal(retries, 1); assert.equal(handler.getMinesSession('retry'), session); assert.equal(paid, 0);
 failed = false; await handler.expireMinesSession(session); assert.equal(paid, 141); assert.equal(handler.getMinesSession('retry'), undefined);
});

test('suggestion and confession waiters time out without stealing a held channel lock', async () => {
 for (const name of ['suggestion', 'confession']) {
  let now = Date.now(); let waits = 0; let unblock!: (value: any) => void; let posts = 0;
  const posted = { id: 'post', react: async () => {} };
  const channel = { id: 'channel', send: async () => { posts++; return posts === 1 ? new Promise(resolve => { unblock = resolve; }) : posted; } };
  class FakeDate extends Date { static now() { return now; } }
  const conf = { getConfessionChannel: async () => 'channel', getConfessionConfig: async () => ({}), createConfessionRecord: async () => ({ id: 1 }), setConfessionPanelMessageId: async () => {} };
  const suggestion = { getSuggestionChannel: async () => 'channel', isBlacklisted: async () => false, getSuggestionConfig: async () => ({}), createSuggestion: async () => ({ id: 1 }), updateSuggestionMessageId: async () => {}, setSuggestionPanelMessageId: async () => {} };
  const handler = loadModule(`src/modules/${name}/_${name}Handler.ts`, { '../../core/database/repositories/confessionRepo.js': conf, '../../core/database/repositories/suggestionRepo.js': suggestion, '../../core/cooldowns/CooldownManager.js': { checkCooldown: () => 0, setCooldown() {} }, './confessionUI.js': { buildAnonymousConfessionPayload: () => ({}), buildConfessionPanel: () => ({}) }, './suggestionUI.js': { buildSuggestionPayload: () => ({}), buildSuggestionPanelPayload: () => ({}) }, '../../core/config/branding.js': { getEmoji: () => '' }, '../../core/ui/index.js': {}, '../../core/logging/WebhookLogger.js': { logEvent() {} }, '../../core/logging/ConsoleLogger.js': { consoleLog() {} } }, { Date: FakeDate, setTimeout: (fn: any, ms: number) => { if (++waits > 51) throw new Error('Channel lock waited longer than 5000ms'); now += ms; queueMicrotask(fn); return 1; } });
  const submit = handler[name === 'confession' ? 'handleConfessionModal' : 'handleSuggestionModal'];
  let reply = '';
  const interaction = (id: string) => ({ customId: name === 'confession' ? 'confess_modal_submit' : 'suggest_modal_submit', guild: { id: 'guild', channels: { fetch: async () => channel } }, user: { id, username: id }, fields: { getTextInputValue: () => 'message' }, deferReply: async () => {}, editReply: async (value: any) => { reply = value.content; } });
  const first = submit(interaction('first'));
  while (!unblock) await new Promise(resolve => setImmediate(resolve));
  await submit(interaction('second'));
  assert.match(reply, /busy|try again|timeout/i); assert.equal(posts, 1);
  unblock(posted); await first;
 }
});

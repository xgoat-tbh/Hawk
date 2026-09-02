import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeValue, isConfigEqual } from '../web/hooks/useFormDraft.js';

test('normalizeValue normalizes undefined, null, and empty trimmed strings', () => {
  assert.equal(normalizeValue(null), null);
  assert.equal(normalizeValue(undefined), null);
  assert.equal(normalizeValue('  hello  '), 'hello');
  assert.deepEqual(normalizeValue({ a: undefined, b: ' test ' }), { a: null, b: 'test' });
});

test('isConfigEqual accurately identifies identical objects regardless of key order', () => {
  const obj1 = {
    prefix: '!',
    enabled: true,
    channelId: '123456789012345678',
    embed: {
      title: 'Welcome',
      color: '#ffffff',
    },
  };

  const obj2 = {
    embed: {
      color: '#ffffff',
      title: 'Welcome',
    },
    enabled: true,
    channelId: '123456789012345678',
    prefix: '!',
  };

  assert.equal(isConfigEqual(obj1, obj2), true);
});

test('isConfigEqual detects dirty state on value mutations', () => {
  const persisted = {
    enabled: false,
    channelId: '123456789012345678',
    title: 'Welcome!',
  };

  const draftClean = {
    enabled: false,
    channelId: '123456789012345678',
    title: 'Welcome!',
  };

  const draftDirty = {
    enabled: true,
    channelId: '123456789012345678',
    title: 'Welcome!',
  };

  assert.equal(isConfigEqual(draftClean, persisted), true);
  assert.equal(isConfigEqual(draftDirty, persisted), false);
});

test('Dirty state becomes false when draft values are edited back to persisted baseline', () => {
  const persisted = {
    prefix: '!',
    botCommanderRoleId: '999999999999999999',
  };

  let draft = { ...persisted, prefix: '?' };
  assert.equal(isConfigEqual(draft, persisted), false);

  // User reverts prefix back to '!'
  draft = { ...draft, prefix: '!' };
  assert.equal(isConfigEqual(draft, persisted), true);
});

test('Simulated Save Lifecycle: success updates persisted baseline and clears dirty state', async () => {
  const initialServerConfig = {
    prefix: '!',
    log_channel_id: null,
  };

  let persisted = { ...initialServerConfig };
  let draft = { prefix: '?', log_channel_id: '111222333444555666' };

  let isDirty = !isConfigEqual(draft, persisted);
  assert.equal(isDirty, true);

  // Simulate API save
  const mockApiSave = async (payload: typeof draft) => {
    return {
      success: true,
      data: payload,
    };
  };

  const res = await mockApiSave(draft);
  assert.equal(res.success, true);

  // Persisted baseline updated from server data
  persisted = res.data;
  isDirty = !isConfigEqual(draft, persisted);

  assert.equal(isDirty, false);
});

test('Simulated Save Lifecycle: failure retains draft edits and dirty state remains true', async () => {
  const initialServerConfig = {
    currency_symbol: '$',
    start_balance: 0,
  };

  const persisted = { ...initialServerConfig };
  const draft = { currency_symbol: '🪙', start_balance: 500 };

  let isDirty = !isConfigEqual(draft, persisted);
  assert.equal(isDirty, true);

  // Simulate API failure
  const mockApiSave = async () => {
    throw new Error('Database connection failed');
  };

  let saveError: string | null = null;
  try {
    await mockApiSave();
  } catch (err: any) {
    saveError = err.message;
  }

  assert.equal(saveError, 'Database connection failed');
  // Draft retained, dirty remains true
  assert.equal(draft.currency_symbol, '🪙');
  assert.equal(!isConfigEqual(draft, persisted), true);
});

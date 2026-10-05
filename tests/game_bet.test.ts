import test from 'node:test';
import assert from 'node:assert/strict';
import { validGameBet } from '../src/core/utils/gameBet.js';
import { incomeIntervalSeconds } from '../src/core/utils/incomeInterval.js';
test('game bets reject unsafe, fractional and out-of-limit amounts', () => {
  for (const value of [NaN, Infinity, 1.5, 0, -1, 9, 50001, Number.MAX_SAFE_INTEGER + 1]) assert.equal(validGameBet(value, 10, 50000), false);
  assert.equal(validGameBet(10, 10, 50000), true); assert.equal(validGameBet(50000, 10, 50000), true);
});
test('income intervals support legacy seconds and dashboard durations', () => {
 assert.equal(incomeIntervalSeconds('12h'), 43200); assert.equal(incomeIntervalSeconds('2d'), 172800); assert.equal(incomeIntervalSeconds(3600), 3600); assert.equal(incomeIntervalSeconds('0'), 0); assert.equal(incomeIntervalSeconds('invalid'), 86400);
});

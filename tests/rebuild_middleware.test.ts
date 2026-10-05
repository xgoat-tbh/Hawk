import test from 'node:test';
import assert from 'node:assert/strict';

test('sliding window rejects bursts and recovers only as old requests expire', async () => {
  const { SlidingWindowLimiter } = await import('../web/lib/rateLimit.js');
  const limiter = new SlidingWindowLimiter();
  assert.equal(limiter.check('a', 2, 1000, 100).allowed, true);
  assert.equal(limiter.check('a', 2, 1000, 900).allowed, true);
  assert.equal(limiter.check('a', 2, 1000, 1000).allowed, false);
  assert.equal(limiter.check('a', 2, 1000, 1100).allowed, true);
  assert.equal(limiter.check('a', 2, 1000, 1101).allowed, false);
  assert.equal(limiter.check('b', 2, 1000, 1101).allowed, true);
});

test('CSRF requires a same-origin request and a matching unpredictable cookie', async () => {
  const { validateCsrf } = await import('../web/lib/csrf.js');
  const token = 'a'.repeat(64);
  assert.equal(validateCsrf('https://hawk.test', 'https://hawk.test', token, token), true);
  assert.equal(validateCsrf('https://evil.test', 'https://hawk.test', token, token), false);
  assert.equal(validateCsrf(null, 'https://hawk.test', token, token), false);
  assert.equal(validateCsrf('https://hawk.test', 'https://hawk.test', token, 'b'.repeat(64)), false);
  assert.equal(validateCsrf('https://hawk.test', 'https://hawk.test', 'tiny', 'tiny'), false);
});

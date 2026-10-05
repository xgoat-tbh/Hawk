import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { clientIp } from '../web/lib/clientIp.js';
test('only signed, recent server peer addresses are trusted without proxy mode', () => {
 const oldSecret = process.env.HAWK_INTERNAL_IP_SECRET; const oldProxy = process.env.TRUST_PROXY;
 try {
  process.env.HAWK_INTERNAL_IP_SECRET = 'test-only-secret'; process.env.TRUST_PROXY = 'false';
  const headers = new Headers({ 'x-hawk-client-ip': '192.0.2.10', 'x-hawk-ip-time': String(Date.now()), 'x-forwarded-for': '198.51.100.1' });
  assert.equal(clientIp(headers), null);
  headers.set('x-hawk-ip-signature', crypto.createHmac('sha256', process.env.HAWK_INTERNAL_IP_SECRET).update(`192.0.2.10:${headers.get('x-hawk-ip-time')}`).digest('hex')); assert.equal(clientIp(headers), '192.0.2.10');
  headers.set('x-hawk-client-ip', '192.0.2.11'); assert.equal(clientIp(headers), null);
 } finally { if (oldSecret === undefined) delete process.env.HAWK_INTERNAL_IP_SECRET; else process.env.HAWK_INTERNAL_IP_SECRET = oldSecret; if (oldProxy === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY = oldProxy; }
});

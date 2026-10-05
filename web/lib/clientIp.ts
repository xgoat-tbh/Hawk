import crypto from 'node:crypto';
export function clientIp(headers: Headers): string | null {
  if (process.env.TRUST_PROXY === 'true') return headers.get('x-forwarded-for')?.split(',')[0].trim().replace(/^::ffff:/, '') || null;
  const ip = headers.get('x-hawk-client-ip'); const stamp = headers.get('x-hawk-ip-time'); const signature = headers.get('x-hawk-ip-signature');
  if (!ip || !stamp || !signature || !process.env.HAWK_INTERNAL_IP_SECRET || !/^\d+$/.test(stamp) || Math.abs(Date.now() - Number(stamp)) > 30_000 || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = crypto.createHmac('sha256', process.env.HAWK_INTERNAL_IP_SECRET).update(`${ip}:${stamp}`).digest();
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected) ? ip : null;
}

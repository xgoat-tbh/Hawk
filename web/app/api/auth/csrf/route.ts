import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { CSRF_COOKIE } from '@/lib/csrf';

export function GET(req: NextRequest) {
  const existing = req.cookies.get(CSRF_COOKIE)?.value;
  const token = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : randomBytes(32).toString('hex');
  const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
  const res = NextResponse.json({ token }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(CSRF_COOKIE, token, { secure: isHttps, sameSite: 'lax', path: '/' });
  return res;
}

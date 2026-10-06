import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken, canViewGuild, canManageGuild } from '@/lib/auth';
import { validateCsrf, CSRF_COOKIE } from '@/lib/csrf';
import { rateLimiter } from '@/lib/rateLimit';
import { clientIp } from '@/lib/clientIp';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === '/api/health' && ['GET', 'HEAD'].includes(req.method)) return NextResponse.next();
  const api = path.startsWith('/api/');
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const origin = process.env.DASHBOARD_ORIGIN || req.nextUrl.origin;
  const ip = clientIp(req.headers);
  const ips = process.env.ALLOWED_IPS?.split(',').map(v => v.trim()).filter(Boolean);
  if (ips?.length && (!ip || !ips.includes(ip))) return NextResponse.json({ error: 'IP not allowed' }, { status: 403 });
  const token = req.cookies.get('hawk_session')?.value;
  const tier = path.startsWith('/api/auth/otp/') ? 'auth' : mutation ? 'write' : 'read';
  const limit = tier === 'auth' ? 5 : tier === 'write' ? 30 : 60;
  if (api) {
    if (mutation && !validateCsrf(req.headers.get('origin'), origin, req.cookies.get(CSRF_COOKIE)?.value, req.headers.get('x-csrf-token'))) {
      return NextResponse.json({ error: 'Invalid CSRF token or request origin' }, { status: 403 });
    }
    const length = Number(req.headers.get('content-length') || 0);
    if (length > 256_000) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    if (mutation && req.body) {
      const reader = req.clone().body!.getReader(); let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          bytes += value.byteLength;
          if (bytes > 256_000) { void reader.cancel(); return NextResponse.json({ error: 'Request too large' }, { status: 413 }); }
        }
      } finally { reader.releaseLock(); }
    }
    let identity = token || ip || 'unidentified';
    if (tier === 'auth') {
      if (ip) identity = ip;
      else {
        const body = await req.clone().json().catch(() => ({}));
        const userId = typeof body.userId === 'string' ? body.userId.trim().replace(/[<@!>]/g, '') : '';
        identity = /^\d{17,20}$/.test(userId) ? `account:${userId}` : `csrf:${req.cookies.get(CSRF_COOKIE)?.value || 'invalid'}`;
      }
    }
    const result = rateLimiter.check(`${tier}:${identity}`, tier === 'auth' || ip || token ? limit : 120);
    if (!result.allowed) return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(result.retryAfter) } });

  }
  const protectedPath = path.startsWith('/dashboard') || (api && !path.startsWith('/api/auth/') && path !== '/api/health');
  if (protectedPath) {
    const session = token ? await getSessionFromToken(token) : null;
    if (!session) return api ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) : NextResponse.redirect(new URL('/', origin));
    const guildId = path.match(/^\/api\/guilds\/(\d+)/)?.[1] || path.match(/^\/dashboard\/(\d+)/)?.[1];
    if (guildId && !(await (mutation ? canManageGuild : canViewGuild)(session.id, guildId))) {
      return api ? NextResponse.json({ error: mutation ? 'This account has view-only access' : 'Forbidden' }, { status: 403 }) : NextResponse.redirect(new URL('/dashboard', origin));
    }
  }
  const res = NextResponse.next();
  if (api) res.headers.set('Cache-Control', 'private, no-store');
  return res;
}
export const config = { matcher: ['/api/:path*', '/dashboard/:path*'], runtime: 'nodejs' };

export const CSRF_COOKIE = 'hawk_csrf';

export function validateOrigin(
  origin: string | null,
  expectedOrigin: string,
  host?: string | null
): boolean {
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const expectedUrl = new URL(expectedOrigin);
    const hostMatches = Boolean(host && (originUrl.host === host || originUrl.hostname === host));
    const originMatches = originUrl.origin === expectedUrl.origin;
    const isLoopback = Boolean(
      ['localhost', '127.0.0.1', '0.0.0.0'].includes(originUrl.hostname) &&
      (['localhost', '127.0.0.1', '0.0.0.0'].includes(expectedUrl.hostname) || host?.startsWith('localhost') || host?.startsWith('127.0.0.1'))
    );

    return originMatches || hostMatches || isLoopback;
  } catch {
    return false;
  }
}

export function validateCsrf(
  origin: string | null,
  expectedOrigin: string,
  cookie: string | undefined,
  header: string | null,
  host?: string | null
): boolean {
  if (!validateOrigin(origin, expectedOrigin, host)) return false;
  if (!cookie || !header || !/^[a-f0-9]{64}$/.test(cookie)) return false;
  if (cookie.length !== header.length) return false;
  let mismatch = 0;
  for (let i = 0; i < cookie.length; i++) mismatch |= cookie.charCodeAt(i) ^ header.charCodeAt(i);
  return mismatch === 0;
}

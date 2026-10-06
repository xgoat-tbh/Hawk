export const CSRF_COOKIE = 'hawk_csrf';

export function validateOrigin(
  origin: string | null,
  expectedOrigin: string,
  host?: string | null
): boolean {
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const expectedUrl = new URL(expectedOrigin);
    return origin === originUrl.origin && originUrl.origin === expectedUrl.origin;
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

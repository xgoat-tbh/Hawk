const SNOWFLAKE_REGEX = /^\d{17,20}$/;

export function cleanSnowflake(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const clean = id.trim();
  return SNOWFLAKE_REGEX.test(clean) ? clean : null;
}

export function cleanString(str: unknown, maxLen = 2000): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

export function cleanInt(val: unknown, min = 0, max = 1_000_000_000, fallback = 0): number {
  const parsed = Number(val);
  if (isNaN(parsed) || !isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export type HandlerResult =
  | { success: true; data: any }
  | { success: false; error: string; status?: number };

export function cleanSnowflakeArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('Use at most 100 Discord IDs');
  const ids = value.map(cleanSnowflake);
  if (ids.some(id => !id)) throw new Error('Invalid Discord ID');
  return [...new Set(ids as string[])];
}
export function cleanJSON(value: unknown, depth = 0): unknown {
  if (depth > 12) throw new Error('JSON is too deeply nested');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length <= 10000) return value;
  if (Array.isArray(value) && value.length <= 200) return value.map(v => cleanJSON(v, depth + 1));
  if (value && typeof value === 'object' && Object.keys(value).length <= 100) return Object.fromEntries(Object.entries(value).map(([k, v]) => { if (['__proto__','constructor','prototype'].includes(k)) throw new Error('Unsafe JSON key'); return [k, cleanJSON(v, depth + 1)]; }));
  throw new Error('Invalid or oversized JSON');
}
export function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (value.length > 2048) throw new Error('URL is too long');
  const url = new URL(value);
  // Embeds only use approved media hosts; DNS rebinding and private-IP targets cannot pass.
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !['cdn.discordapp.com','media.discordapp.net','i.imgur.com','images.unsplash.com'].includes(url.hostname)) throw new Error('Use an HTTPS image URL from Discord, Imgur or Unsplash');
  return url.href;
}

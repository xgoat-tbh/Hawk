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

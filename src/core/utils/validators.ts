const SNOWFLAKE_RE = /^\d{17,20}$/;
const URL_RE = /^https?:\/\/\S+$/i;

export function isSnowflake(value: string): boolean {
  return SNOWFLAKE_RE.test(value);
}

export function isUrl(value: string): boolean {
  return URL_RE.test(value);
}

export function sanitize(text: string): string {
  if (!text) return text;
  return text
    .replace(/@everyone/g, 'everyone')
    .replace(/@here/g, 'here')
    .replace(/<@&(\d{17,20})>/g, (_match, roleId) => `<\u200b@\u200b&\u200b${roleId}>`);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

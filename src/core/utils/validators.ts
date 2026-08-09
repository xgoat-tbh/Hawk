import type { Guild } from 'discord.js';

const SNOWFLAKE_RE = /^\d{17,20}$/;
const URL_RE = /^https?:\/\/\S+$/i;

export function isSnowflake(value: string): boolean {
  return SNOWFLAKE_RE.test(value);
}

export function isUrl(value: string): boolean {
  return URL_RE.test(value);
}

export function sanitize(text: string, guild?: Guild | null): string {
  if (!text) return text;
  let result = text
    .replace(/@everyone/g, '**everyone**')
    .replace(/@here/g, '**here**');

  result = result.replace(/<@&(\d{17,20})>/g, (_match, roleId) => {
    const role = guild?.roles.cache.get(roleId);
    const name = role ? role.name : roleId;
    return `**${name}**`;
  });

  result = result.replace(/<@!?(\d{17,20})>/g, (_match, userId) => {
    const member = guild?.members.cache.get(userId);
    const name = member ? (member.displayName || member.user.username) : userId;
    return `**${name}**`;
  });

  return result;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

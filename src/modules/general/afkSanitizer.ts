/**
 * Strictly sanitizes an AFK reason to guarantee it can NEVER produce a Discord ping.
 */
export function sanitizeAfkReason(reason: string): string {
  if (!reason || !reason.trim()) return 'AFK';

  let sanitized = reason.trim();

  // 1. Break all @ symbols so @everyone, @here, @user, @role cannot ping
  sanitized = sanitized.replace(/@/g, '@\u200b');

  // 2. Break Discord mention syntax <@..., <@&..., <#...
  sanitized = sanitized.replace(/<([@#&!])/g, '<\u200b$1');

  // 3. Break raw snowflake IDs (17-20 digits) so Discord doesn't resolve them
  sanitized = sanitized.replace(/(\d{6})(\d+)/g, '$1\u200b$2');

  // 4. Truncate to maximum 200 characters to prevent spam
  if (sanitized.length > 200) {
    sanitized = sanitized.slice(0, 197) + '...';
  }

  return sanitized;
}

/**
 * Formats elapsed milliseconds into a clean human-readable duration string.
 * Example: 81000ms -> "1 minute, 21 seconds"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds === 0) return '0 seconds';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  }

  return parts.join(', ');
}

import { PermissionsBitField } from 'discord.js';
import type { GuildMember } from 'discord.js';

export async function applyAfkNickname(member: GuildMember): Promise<void> {
  try {
    const guild = member.guild;
    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return;
    }
    if (member.id === guild.ownerId) {
      return;
    }
    if (botMember.roles.highest.position <= member.roles.highest.position) {
      return;
    }

    const currentName = member.displayName;
    if (currentName.startsWith('[AFK] ')) {
      return;
    }

    const newName = `[AFK] ${currentName}`.slice(0, 32);
    await member.setNickname(newName).catch(() => {});
  } catch {
    // Fail silently if nickname change is restricted
  }
}

export async function removeAfkNickname(member: GuildMember): Promise<void> {
  try {
    const guild = member.guild;
    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return;
    }
    if (member.id === guild.ownerId) {
      return;
    }
    if (botMember.roles.highest.position <= member.roles.highest.position) {
      return;
    }

    const currentName = member.displayName;
    if (!currentName.startsWith('[AFK] ')) {
      return;
    }

    const restoredName = currentName.replace(/^\[AFK\]\s*/i, '');
    await member.setNickname(restoredName).catch(() => {});
  } catch {
    // Fail silently if nickname change is restricted
  }
}


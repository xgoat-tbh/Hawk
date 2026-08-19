import type { Guild, GuildMember, User } from 'discord.js';

export function formatUser(target: GuildMember | User | string, guild?: Guild | null): string {
  if (!target) return '**Unknown**';

  if (typeof target === 'string') {
    // Check guild member cache first
    const member = guild?.members.cache.get(target);
    if (member) return `**${member.displayName}**`;

    // Check client user cache
    const client = guild?.client ?? (globalThis as any).hawkClient;
    const user = client?.users?.cache.get(target);
    if (user) return `**${user.displayName || user.globalName || user.username}**`;

    return `**${target}**`;
  }

  if ('displayName' in target && target.displayName) {
    return `**${target.displayName}**`;
  }

  if ('username' in target) {
    const user = target as User;
    return `**${user.displayName || user.globalName || user.username}**`;
  }

  return `**User**`;
}

export function mentionUser(target: GuildMember | User | string, guild?: Guild | null): string {
  return formatUser(target, guild);
}

export function mentionRole(id: string): string {
  return `<@&${id}>`;
}

export function mentionChannel(id: string): string {
  return `<#${id}>`;
}

export function timestamp(date: Date, style: 'R' | 'f' | 'F' | 't' | 'T' | 'd' | 'D' = 'R'): string {
  const seconds = Math.floor(date.getTime() / 1000);
  return `<t:${seconds}:${style}>`;
}

export function codeBlock(text: string, language = ''): string {
  return `\`\`\`${language}\n${text}\n\`\`\``;
}

export function inlineCode(text: string): string {
  return `\`${text}\``;
}

export function bold(text: string): string {
  return `**${text}**`;
}

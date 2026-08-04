import { getEmoji } from '../../core/config/branding.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import type { ComponentV2Payload } from '../../core/utils/componentsV2.js';
import { sanitizeAfkReason, formatDuration } from './afkSanitizer.js';

export const AFK_ALLOWED_MENTIONS = {
  parse: [],
  users: [],
  roles: [],
  repliedUser: false,
} as const;

export function buildAfkSetPayload(userId: string, reason?: string): ComponentV2Payload {
  const successEmoji = getEmoji('AFK_SUCCESS');
  const cleanReason = reason ? sanitizeAfkReason(reason) : '';
  const text = cleanReason && cleanReason !== 'AFK'
    ? `${successEmoji} <@${userId}> · You're now AFK with status: **${cleanReason}**`
    : `${successEmoji} <@${userId}> · You're now AFK`;

  return buildV2Container({
    text,
  });
}

export function buildAfkNoticePayload(
  afkUsers: { userId: string; reason: string; startedAt: Date }[],
): ComponentV2Payload {
  const noticeEmoji = getEmoji('AFK_NOTICE');

  const lines: string[] = [];
  afkUsers.forEach((user, index) => {
    const unixSeconds = Math.floor(user.startedAt.getTime() / 1000);
    const cleanReason = sanitizeAfkReason(user.reason);
    const prefix = index === 0 ? `${noticeEmoji} ` : '';

    lines.push(`${prefix}<@${user.userId}> went AFK <t:${unixSeconds}:R>\nWith Reason: ${cleanReason}`);
  });

  return buildV2Container({
    text: lines.join('\n\n'),
  });
}

export function buildAfkWelcomeBackPayload(userId: string, elapsedMs: number): ComponentV2Payload {
  const welcomeEmoji = getEmoji('AFK_WELCOME_BACK');
  const durationStr = formatDuration(elapsedMs);

  return buildV2Container({
    text: `${welcomeEmoji} Welcome back, <@${userId}>! You were gone for **${durationStr}**.`,
  });
}

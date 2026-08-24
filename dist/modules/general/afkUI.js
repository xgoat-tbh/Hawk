import { getEmoji } from '../../core/config/branding.js';
import { ui } from '../../core/ui/index.js';
import { sanitizeAfkReason, formatDuration } from './afkSanitizer.js';
import { formatUser } from '../../core/utils/formatters.js';
export const AFK_ALLOWED_MENTIONS = {
    parse: [],
    users: [],
    roles: [],
    repliedUser: false,
};
export function buildAfkSetPayload(userId, reason) {
    const successEmoji = getEmoji('AFK_SUCCESS');
    const cleanReason = reason ? sanitizeAfkReason(reason) : '';
    const userDisplay = formatUser(userId);
    const text = cleanReason && cleanReason !== 'AFK'
        ? `${successEmoji} ${userDisplay} · You're now AFK with status: **${cleanReason}**`
        : `${successEmoji} ${userDisplay} · You're now AFK`;
    return ui.standard({
        text,
    });
}
export function buildAfkNoticePayload(afkUsers) {
    const noticeEmoji = getEmoji('AFK_NOTICE');
    const lines = [];
    afkUsers.forEach((user, index) => {
        const unixSeconds = Math.floor(user.startedAt.getTime() / 1000);
        const cleanReason = sanitizeAfkReason(user.reason);
        const prefix = index === 0 && noticeEmoji ? `${noticeEmoji} ` : '';
        const userDisplay = formatUser(user.userId);
        lines.push(`${prefix}${userDisplay} went AFK <t:${unixSeconds}:R>\nWith Reason: ${cleanReason}`);
    });
    return ui.standard({
        text: lines.join('\n\n'),
    });
}
export function buildAfkWelcomeBackPayload(userId, elapsedMs) {
    const welcomeEmoji = getEmoji('AFK_WELCOME_BACK');
    const durationStr = formatDuration(elapsedMs);
    const prefix = welcomeEmoji ? `${welcomeEmoji} ` : '';
    const userDisplay = formatUser(userId);
    return ui.standard({
        text: `${prefix}Welcome back, ${userDisplay}! You were gone for **${durationStr}**.`,
    });
}
export function buildAfkPastTensePayload(userId, reason) {
    const successEmoji = getEmoji('AFK_SUCCESS');
    const cleanReason = reason ? sanitizeAfkReason(reason) : '';
    const userDisplay = formatUser(userId);
    const text = cleanReason && cleanReason !== 'AFK'
        ? `${successEmoji} ${userDisplay} · Was AFK: **${cleanReason}**`
        : `${successEmoji} ${userDisplay} · Was AFK`;
    return ui.standard({
        text,
    });
}
//# sourceMappingURL=afkUI.js.map
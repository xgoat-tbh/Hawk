const UNICODE_FALLBACKS = {
    currency: '',
    cash: '',
    bank: '',
    leaderboard: '',
    casino: '',
    dice: '',
    cards: '',
    slots: '',
    cockfight: '',
    roulette: '',
    store: '',
    inventory: '',
    pvc: '',
    fastag: '',
    lock: '',
    unlock: '',
    hide: '',
    delete: '',
    transfer: '',
    rename: '',
    limit: '',
    economy: '',
    income: '',
    success: '',
    error: '',
    warning: '',
    info: '',
    denied: '',
};
export const branding = {
    footerText: 'Amo | 2026',
    defaultColor: 0x1e1f22,
    emojis: {
        success: '',
        error: '',
        warning: '',
        info: '',
        loading: '',
        denied: '',
        upvote: '',
        downvote: '',
        accepted: '',
        considered: '',
        voice: '',
        gaming: '',
        suggestion: '',
        confession: '',
        sticky: '',
        moderation: '',
        welcome: '',
        media: '',
        general: '',
        owner: '',
        specials: '',
        AFK_SUCCESS: '',
        AFK_WELCOME_BACK: '',
        AFK_NOTICE: '',
        currency: '',
        cash: '',
        bank: '',
        leaderboard: '',
        casino: '',
        dice: '',
        cards: '',
        slots: '',
        cockfight: '',
        roulette: '',
        store: '',
        inventory: '',
        pvc: '',
        fastag: '',
        lock: '',
        unlock: '',
        hide: '',
        delete: '',
        transfer: '',
        rename: '',
        limit: '',
        economy: '',
        income: '',
    },
};
export function getEmoji(key) {
    if (key === 'AFK_SUCCESS') {
        return branding.emojis.AFK_SUCCESS ?? branding.emojis.success ?? '';
    }
    if (key === 'AFK_WELCOME_BACK') {
        return branding.emojis.AFK_WELCOME_BACK ?? '';
    }
    if (key === 'AFK_NOTICE') {
        return branding.emojis.AFK_NOTICE ?? '';
    }
    const custom = branding.emojis[key];
    if (custom)
        return custom;
    return UNICODE_FALLBACKS[key] ?? '';
}
export function toReactableEmoji(emojiStr, fallback = '') {
    if (!emojiStr)
        return fallback;
    const match = /^<a?:[^:]+:(\d+)>$/.exec(emojiStr);
    if (match) {
        return match[1];
    }
    return emojiStr;
}
//# sourceMappingURL=branding.js.map
import type { BrandingConfig } from '../../types/config.js';

export const branding: BrandingConfig = {
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
  },
};

export function getEmoji(key: string): string {
  if (key === 'AFK_SUCCESS') {
    return branding.emojis.AFK_SUCCESS ?? branding.emojis.success ?? '';
  }
  if (key === 'AFK_WELCOME_BACK') {
    return branding.emojis.AFK_WELCOME_BACK ?? '';
  }
  if (key === 'AFK_NOTICE') {
    return branding.emojis.AFK_NOTICE ?? '';
  }
  return branding.emojis[key] ?? '';
}

export function toReactableEmoji(emojiStr: string, fallback = ''): string {
  if (!emojiStr) return fallback;
  const match = /<a?:[^:]+:(\d+)>/.exec(emojiStr);
  if (match) {
    return match[1];
  }
  return emojiStr;
}

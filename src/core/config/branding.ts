import type { BrandingConfig } from '../../types/config.js';

const UNICODE_FALLBACKS: Record<string, string> = {
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
  // PVC Panel Button Fallbacks
  pvc_btn_add: '➕',
  pvc_btn_autopay: '💳',
  pvc_btn_limit: '👥',
  pvc_btn_trust: '🛡️',
  pvc_btn_rename: '✏️',
  pvc_btn_info: 'ℹ️',
  pvc_btn_transfer: '🔁',
  pvc_btn_privacy: '🔒',
  pvc_btn_remove: '🗑️',
};

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
    transfer: '<:transfer:1548735047123869838>',
    rename: '<:rename:1548735012910924048>',
    limit: '<:limit:1548734915506475118>',
    economy: '',
    income: '',
    // ── PVC Panel Button Custom Emojis ──────────────────────────
    // Custom emoji IDs resolved from mutual server (YOLO):
    pvc_btn_add: '<:add:1548734813307936799>',
    pvc_btn_autopay: '<:autopay:1548734856270315644>',
    pvc_btn_limit: '<:limit:1548734915506475118>',
    pvc_btn_trust: '<:trust:1548735194683543602>',
    pvc_btn_rename: '<:rename:1548735012910924048>',
    pvc_btn_info: '<:info:1548734885814861845>',
    pvc_btn_transfer: '<:transfer:1548735047123869838>',
    pvc_btn_privacy: '<:privacy:1548734951355322518>',
    pvc_btn_remove: '<:remove:1548734982376390686>',
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
  const custom = branding.emojis[key];
  if (custom) return custom;

  // Dynamic fallback: resolve by name from client.emojis.cache across mutual guilds
  const client = (globalThis as any).hawkClient;
  if (client?.emojis?.cache) {
    const cleanName = key.startsWith('pvc_btn_') ? key.slice('pvc_btn_'.length) : key;
    const found = client.emojis.cache.find((e: any) => e.name?.toLowerCase() === cleanName.toLowerCase());
    if (found) {
      return found.toString();
    }
  }

  return UNICODE_FALLBACKS[key] ?? '';
}

export function toReactableEmoji(emojiStr: string, fallback = ''): string {
  if (!emojiStr) return fallback;
  const match = /^<a?:[^:]+:(\d+)>$/.exec(emojiStr);
  if (match) {
    return match[1];
  }
  return emojiStr;
}

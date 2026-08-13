import type { BrandingConfig } from '../../types/config.js';

export const branding: BrandingConfig = {
  footerText: 'Amo Hawk | 2026',
  defaultColor: 0x2b2d31,
  emojis: {
    success: '<:icon_tick:1533549488541663283>',
    error: '<:icon_cross:1533549527892492408>',
    warning: '<:warn:1533454688555634800>',
    info: '<:7135graydot:1533550187392401558>',
    loading: '<:loading:1533455139795370024>',
    denied: '<:icon_cross:1533549527892492408>',
    upvote: '<:yes:1533455532910841856>',
    downvote: '<:no:1533455576401580123>',
    accepted: '<:tick:1533454923423940780>',
    considered: '<:icon_clock:1533456529771073626>',
    voice: '<:24204voicechannelgreen:1533458532400103574>',
    gaming: '<a:SG_game:1533459336460767243>',
    suggestion: '<a:thinking:1533459594289090682>',
    confession: '<:icon:1533458895685685378>',
    sticky: '<:sticky:1533459770550259882>',
    moderation: '<:773429modshieldicon:1533459893653340371>',
    welcome: '<:icon_welcome:1533460007801323611>',
    media: '<:Media:1533460114936303827>',
    general: '<:95805bot:1533459068000407582>',
    owner: '',
    specials: '',
    AFK_SUCCESS: '<:icon_tick:1533549488541663283>',
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

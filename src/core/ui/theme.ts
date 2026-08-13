import { ButtonStyle } from 'discord.js';

export const HawkTheme = {
  colors: {
    primary: 0x5865f2,
    success: 0x57f287,
    error: 0xed4245,
    warning: 0xfee75c,
    info: 0x5865f2,
    neutral: 0x2f3136,
  },

  emojis: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    denied: '🚫',
    prev: '◀',
    next: '▶',
    page: '📄',
  },

  buttons: {
    primary: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success: ButtonStyle.Success,
    danger: ButtonStyle.Danger,
    link: ButtonStyle.Link,
  },

  container: {
    borderless: true,
    accentColor: undefined as number | undefined,
  },
} as const;

export type HawkThemeType = typeof HawkTheme;

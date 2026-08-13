import { ButtonStyle } from 'discord.js';

export const HawkTheme = {
  colors: {
    primary: 0x2b2d31,
    success: 0x2b2d31,
    error: 0xed4245,
    warning: 0xfee75c,
    info: 0x2b2d31,
    neutral: 0x2f3136,
  },

  emojis: {
    success: '',
    error: '',
    warning: '',
    info: '',
    denied: '',
    prev: '',
    next: '',
    page: '',
  },

  buttons: {
    primary: ButtonStyle.Secondary,
    secondary: ButtonStyle.Secondary,
    success: ButtonStyle.Secondary,
    danger: ButtonStyle.Danger,
    link: ButtonStyle.Link,
  },

  container: {
    borderless: true,
    accentColor: undefined as number | undefined,
  },
} as const;

export type HawkThemeType = typeof HawkTheme;

import { ButtonStyle } from 'discord.js';
export const AmoTheme = {
    colors: {
        primary: 0x1e1f22,
        accent: 0x5865f2,
        success: 0x23a55a,
        error: 0xda373c,
        warning: 0xf0b232,
        info: 0x5865f2,
        neutral: 0x2b2d31,
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
        accentColor: undefined,
    },
};
export const HawkTheme = AmoTheme;
//# sourceMappingURL=theme.js.map
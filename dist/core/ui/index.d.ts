import { buildCustomId, parseCustomId, isInteractionOwner } from './customId.js';
import { createContainer, createTextDisplay, createSeparator, createButton, createSelectMenu, createSection, createThumbnail } from './components.js';
import { standard, dashboard, paginated } from './layouts.js';
export declare const ui: {
    readonly theme: {
        readonly colors: {
            readonly primary: 1974050;
            readonly accent: 5793266;
            readonly success: 2336090;
            readonly error: 14300988;
            readonly warning: 15774258;
            readonly info: 5793266;
            readonly neutral: 2829617;
        };
        readonly emojis: {
            readonly success: "";
            readonly error: "";
            readonly warning: "";
            readonly info: "";
            readonly denied: "";
            readonly prev: "";
            readonly next: "";
            readonly page: "";
        };
        readonly buttons: {
            readonly primary: import("discord.js").ButtonStyle.Secondary;
            readonly secondary: import("discord.js").ButtonStyle.Secondary;
            readonly success: import("discord.js").ButtonStyle.Secondary;
            readonly danger: import("discord.js").ButtonStyle.Danger;
            readonly link: import("discord.js").ButtonStyle.Link;
        };
        readonly container: {
            readonly borderless: true;
            readonly accentColor: number | undefined;
        };
    };
    readonly customId: {
        readonly build: typeof buildCustomId;
        readonly parse: typeof parseCustomId;
        readonly isOwner: typeof isInteractionOwner;
    };
    readonly container: typeof createContainer;
    readonly text: typeof createTextDisplay;
    readonly separator: typeof createSeparator;
    readonly button: typeof createButton;
    readonly select: typeof createSelectMenu;
    readonly section: typeof createSection;
    readonly thumbnail: typeof createThumbnail;
    readonly success: (options: import("./status.js").StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: import("discord.js").MessageFlags;
    };
    readonly error: (options: import("./status.js").StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: import("discord.js").MessageFlags;
    };
    readonly warning: (options: import("./status.js").StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: import("discord.js").MessageFlags;
    };
    readonly info: (options: import("./status.js").StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: import("discord.js").MessageFlags;
    };
    readonly empty: (options: import("./status.js").StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: import("discord.js").MessageFlags;
    };
    readonly loading: (text?: string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: import("discord.js").MessageFlags;
    };
    readonly standard: typeof standard;
    readonly dashboard: typeof dashboard;
    readonly paginated: typeof paginated;
};
export type AmoUI = typeof ui;
export type HawkUI = typeof ui;
export { AmoTheme, HawkTheme } from './theme.js';
export * from './customId.js';
export * from './components.js';
export * from './status.js';
export * from './layouts.js';
//# sourceMappingURL=index.d.ts.map
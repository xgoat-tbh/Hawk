import { MessageFlags } from 'discord.js';
import type { ActionRowBuilder } from 'discord.js';
export interface StatusOptions {
    text: string;
    title?: string;
    components?: ActionRowBuilder<any>[];
    accentColor?: number;
}
export declare const status: {
    success: (options: StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: MessageFlags;
    };
    error: (options: StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: MessageFlags;
    };
    warning: (options: StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: MessageFlags;
    };
    info: (options: StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: MessageFlags;
    };
    empty: (options: StatusOptions | string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: MessageFlags;
    };
    loading: (text?: string) => {
        components: import("discord.js").ContainerBuilder[];
        flags: MessageFlags;
    };
};
//# sourceMappingURL=status.d.ts.map
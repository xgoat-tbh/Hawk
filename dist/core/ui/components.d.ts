import { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, SectionBuilder, ThumbnailBuilder } from 'discord.js';
export declare function createContainer(options?: {
    accentColor?: number;
}): ContainerBuilder;
export declare function createTextDisplay(content: string): TextDisplayBuilder;
export declare function createSeparator(divider?: boolean, spacing?: SeparatorSpacingSize): SeparatorBuilder;
export declare function createThumbnail(url: string, description?: string): ThumbnailBuilder;
export interface SectionOptions {
    text: string;
    button?: ButtonBuilder;
    thumbnailUrl?: string;
}
export declare function createSection(options: SectionOptions): SectionBuilder;
export interface ButtonOptions {
    customId: string;
    label?: string;
    emoji?: string;
    style?: ButtonStyle;
    disabled?: boolean;
    url?: string;
}
export declare function createButton(options: ButtonOptions): ButtonBuilder;
export interface SelectOption {
    label: string;
    value: string;
    description?: string;
    emoji?: string;
    default?: boolean;
}
export interface SelectMenuOptions {
    customId: string;
    placeholder?: string;
    options: SelectOption[];
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
}
export declare function createSelectMenu(options: SelectMenuOptions): StringSelectMenuBuilder;
//# sourceMappingURL=components.d.ts.map
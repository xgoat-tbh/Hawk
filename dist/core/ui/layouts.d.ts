import { ActionRowBuilder } from 'discord.js';
import type { Message, ContainerBuilder } from 'discord.js';
import type { CommandContext } from '../../types/command.js';
import type { SectionOptions } from './components.js';
export interface ComponentV2Payload {
    components: ContainerBuilder[];
    flags: number;
}
export interface StandardLayoutOptions {
    title?: string;
    text?: string;
    sections?: (string | SectionOptions)[];
    components?: ActionRowBuilder<any>[];
    accentColor?: number;
    divider?: boolean;
    thumbnailUrl?: string;
    sanitize?: boolean;
}
export declare function standard(options: StandardLayoutOptions): ComponentV2Payload;
export interface DashboardField {
    name: string;
    value: string;
}
export interface DashboardLayoutOptions {
    title: string;
    description?: string;
    fields?: DashboardField[];
    components?: ActionRowBuilder<any>[];
    accentColor?: number;
}
export declare function dashboard(options: DashboardLayoutOptions): ComponentV2Payload;
export interface PaginatedLayoutOptions {
    title: string;
    items: string[];
    pageSize?: number;
    emptyText?: string;
    timeoutMs?: number;
    accentColor?: number;
}
export declare function paginated(ctx: CommandContext, options: PaginatedLayoutOptions): Promise<Message>;
//# sourceMappingURL=layouts.d.ts.map
import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { CommandDefinition } from '../../types/command.js';
import { type ComponentV2Payload } from '../../core/ui/index.js';
export interface HelpCategory {
    id: string;
    name: string;
    description: string;
    modules: string[];
}
export declare const HELP_CATEGORIES: HelpCategory[];
export declare function getCategory(categoryId: string): HelpCategory | undefined;
export declare function getCategoryCommands(categoryId: string): CommandDefinition[];
export declare function buildCategoryDropdown(userId: string, activeCategoryId?: string, usableSet?: Set<string>): ActionRowBuilder<StringSelectMenuBuilder>;
export declare function buildMainHelpEmbed(prefix: string, userId: string, usableSet?: Set<string>): ComponentV2Payload;
export declare function buildCategoryHelpEmbed(categoryId: string, prefix: string, userId: string, page?: number, usableSet?: Set<string>): ComponentV2Payload;
export declare function buildCommandHelpEmbed(command: CommandDefinition, prefix: string): ComponentV2Payload;
//# sourceMappingURL=helpUI.d.ts.map
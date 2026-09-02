import type { Guild, GuildMember, Role, User } from 'discord.js';
export declare function formatUser(target: GuildMember | User | string, guild?: Guild | null): string;
export declare function mentionUser(target: GuildMember | User | string, guild?: Guild | null): string;
export declare function formatRole(target: Role | string, guild?: Guild | null): string;
export declare function mentionRole(target: Role | string, guild?: Guild | null): string;
export declare function mentionChannel(id: string): string;
export declare function timestamp(date: Date, style?: 'R' | 'f' | 'F' | 't' | 'T' | 'd' | 'D'): string;
export declare function codeBlock(text: string, language?: string): string;
export declare function inlineCode(text: string): string;
export declare function bold(text: string): string;
//# sourceMappingURL=formatters.d.ts.map
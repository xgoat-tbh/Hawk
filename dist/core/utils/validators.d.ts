import type { Guild } from 'discord.js';
export declare function isSnowflake(value: string): boolean;
export declare function isUrl(value: string): boolean;
export declare function sanitize(text: string, guild?: Guild | null): string;
export declare function sanitizeAsync(text: string, guild?: Guild | null): Promise<string>;
export declare function clamp(value: number, min: number, max: number): number;
export declare function truncate(text: string, maxLength: number): string;
//# sourceMappingURL=validators.d.ts.map
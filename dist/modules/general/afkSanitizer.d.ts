/**
 * Strictly sanitizes an AFK reason to guarantee it can NEVER produce a Discord ping.
 */
export declare function sanitizeAfkReason(reason: string): string;
/**
 * Formats elapsed milliseconds into a clean human-readable duration string.
 * Example: 81000ms -> "1 minute, 21 seconds"
 */
export declare function formatDuration(ms: number): string;
import type { GuildMember } from 'discord.js';
export declare function applyAfkNickname(member: GuildMember): Promise<{
    success: boolean;
    reason?: string;
}>;
export declare function removeAfkNickname(member: GuildMember): Promise<{
    success: boolean;
    reason?: string;
}>;
//# sourceMappingURL=afkSanitizer.d.ts.map
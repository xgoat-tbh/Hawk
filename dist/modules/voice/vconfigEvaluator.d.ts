import type { GuildMember } from 'discord.js';
export interface VoiceAccessResult {
    allowed: boolean;
    reason?: string;
}
export declare function checkVoiceAccess(guildId: string, member: GuildMember, commandName: string, channelId?: string | null, secondChannelId?: string | null): Promise<VoiceAccessResult>;
//# sourceMappingURL=vconfigEvaluator.d.ts.map
import type { Message, VoiceState, GuildMember } from 'discord.js';
export type FmvStatus = 'COUNTDOWN' | 'WAITING_FOR_VC' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
export interface FmvState {
    id: string;
    guildId: string;
    authorId: string;
    targetId: string;
    destinationChannelId: string;
    requestMessage: Message;
    status: FmvStatus;
    createdAt: number;
    expiresAt: number;
    countdownTimer: NodeJS.Timeout | null;
    expireTimer: NodeJS.Timeout | null;
}
export declare function getActiveFmvRequest(guildId: string, targetId: string): FmvState | undefined;
export declare function getAllActiveFmvRequests(): FmvState[];
export declare function clearFmvStateCache(): void;
export declare function createFmvRequest(options: {
    guildId: string;
    authorId: string;
    targetMember: GuildMember;
    destinationChannelId: string;
    requestMessage: Message;
}): Promise<FmvState>;
export declare function cancelFmvRequest(options: {
    guildId: string;
    authorId: string;
    targetId?: string;
    isElevated?: boolean;
}): Promise<number>;
export declare function handleFmvVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void>;
//# sourceMappingURL=FmvManager.d.ts.map
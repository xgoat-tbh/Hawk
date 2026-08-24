import type { SuggestionRecord, SuggestionStatus, VoteType, VoteCounts, SuggestionBlacklistRecord } from '../../../types/suggestion.js';
export declare function setSuggestionChannel(guildId: string, channelId: string): Promise<void>;
export declare function getSuggestionChannel(guildId: string): Promise<string | null>;
export declare function setSuggestionPanelMessageId(guildId: string, messageId: string | null): Promise<void>;
export declare function getSuggestionPanelMessageId(guildId: string): Promise<string | null>;
export declare function getSuggestionConfig(guildId: string): Promise<{
    channelId: string;
    panelMessageId: string | null;
} | null>;
export declare function getAllSuggestionConfigs(): Promise<{
    guildId: string;
    channelId: string;
    panelMessageId: string | null;
}[]>;
export declare function getNextSuggestionNumber(guildId: string): Promise<number>;
export declare function createSuggestion(guildId: string, authorId: string, content: string, channelId: string, messageId: string): Promise<SuggestionRecord>;
export declare function getSuggestionByNumber(guildId: string, number: number): Promise<SuggestionRecord | null>;
export declare function getSuggestionByMessageId(guildId: string, messageId: string): Promise<SuggestionRecord | null>;
export declare function getSuggestionById(suggestionId: number): Promise<SuggestionRecord | null>;
export declare function updateSuggestionMessageId(suggestionId: number, messageId: string): Promise<void>;
export declare function updateSuggestionStatus(suggestionId: number, status: SuggestionStatus, staffId: string): Promise<SuggestionRecord | null>;
export declare function castVote(guildId: string, suggestionId: number, userId: string, voteType: VoteType): Promise<{
    counts: VoteCounts;
    userVote: VoteType;
    previousVote: VoteType | null;
}>;
export declare function removeVote(guildId: string, suggestionId: number, userId: string): Promise<VoteCounts>;
export declare function getUserVote(guildId: string, suggestionId: number, userId: string): Promise<VoteType | null>;
export declare function getVoteCounts(suggestionId: number): Promise<VoteCounts>;
export declare function isBlacklisted(guildId: string, userId: string): Promise<boolean>;
export declare function addBlacklist(guildId: string, userId: string, createdBy: string): Promise<boolean>;
export declare function removeBlacklist(guildId: string, userId: string): Promise<boolean>;
export declare function listBlacklist(guildId: string): Promise<SuggestionBlacklistRecord[]>;
export declare function resetSuggestionDataForGuild(guildId: string): Promise<void>;
//# sourceMappingURL=suggestionRepo.d.ts.map
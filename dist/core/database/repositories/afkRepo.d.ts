export interface AfkRecord {
    guildId: string;
    userId: string;
    reason: string;
    startedAt: Date;
    channelId?: string | null;
    messageId?: string | null;
}
export interface CachedAfk {
    reason: string;
    startedAt: Date;
    channelId?: string | null;
    messageId?: string | null;
}
export declare function getAfkCacheSize(): number;
export declare function getAfkEntriesForGuild(guildId: string): (CachedAfk & {
    userId: string;
})[];
export declare function clearAllAfkRecords(guildId?: string): Promise<void>;
export declare function loadAfkCache(): Promise<number>;
export declare function setAfk(guildId: string, userId: string, reason: string, channelId?: string | null, messageId?: string | null): Promise<CachedAfk>;
export declare function updateAfkMessageInfo(guildId: string, userId: string, channelId: string, messageId: string): Promise<void>;
export declare function removeAfk(guildId: string, userId: string): Promise<CachedAfk | null>;
export declare function getAfk(guildId: string, userId: string): CachedAfk | null;
export declare function isAfk(guildId: string, userId: string): boolean;
//# sourceMappingURL=afkRepo.d.ts.map
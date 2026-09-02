export declare function isNoPrefixEnabled(guildId: string, userId: string): boolean;
export declare function getNoPrefixUsersForGuild(guildId: string): string[];
export declare function setNoPrefix(guildId: string, userId: string, enabled: boolean): Promise<void>;
export declare function toggleNoPrefix(guildId: string, userId: string): Promise<boolean>;
export declare function loadNoPrefixCache(): Promise<void>;
//# sourceMappingURL=NoPrefixConfig.d.ts.map
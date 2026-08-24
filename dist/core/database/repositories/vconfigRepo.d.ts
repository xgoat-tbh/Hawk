export interface VConfigRule {
    id: number;
    guildId: string;
    commandName: string;
    roleId: string;
    mode: 'wl' | 'bl';
    channelIds: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare function invalidateVConfigCache(guildId: string): void;
export declare function getVConfigRulesForGuild(guildId: string): Promise<VConfigRule[]>;
export declare function saveVConfigRule(guildId: string, commandName: string, roleId: string, mode: 'wl' | 'bl', channelIds: string[]): Promise<VConfigRule>;
export declare function removeVConfigRule(guildId: string, commandName: string, roleId: string, mode: 'wl' | 'bl'): Promise<boolean>;
export declare function getVConfigRules(guildId: string, commandName: string, roleId?: string): Promise<VConfigRule[]>;
//# sourceMappingURL=vconfigRepo.d.ts.map
import type { RestrictionRecord, RestrictionEffect } from '../../../types/permission.js';
export declare function invalidateRestrictionCache(guildId: string): void;
export declare function getRestrictionsForGuild(guildId: string): Promise<RestrictionRecord[]>;
export declare function getRestrictions(guildId: string, commandName: string | null, moduleName: string): Promise<RestrictionRecord[]>;
export declare function checkRestriction(guildId: string, commandName: string, moduleName: string, channelId: string, categoryId: string | null, userId: string, roleIds: string[]): Promise<{
    restricted: boolean;
    effect: RestrictionEffect | 'inherit';
}>;
export declare function addRestriction(guildId: string, commandName: string | null, moduleName: string, targetType: 'user' | 'role' | null, targetId: string | null, locationType: 'channel' | 'category', locationId: string, effect: RestrictionEffect): Promise<void>;
export declare function removeRestriction(guildId: string, commandName: string | null, moduleName: string, targetType: 'user' | 'role' | null, targetId: string | null, locationType: 'channel' | 'category', locationId: string): Promise<boolean>;
//# sourceMappingURL=restrictionRepo.d.ts.map
import type { IgnoreRecord } from '../../../types/permission.js';
export declare function invalidateIgnoreCache(guildId: string): void;
export declare function getIgnoresForGuild(guildId: string): Promise<IgnoreRecord[]>;
export declare function isIgnored(guildId: string, entityType: 'user' | 'role' | 'channel' | 'category', entityId: string, commandName?: string, moduleName?: string): Promise<boolean>;
export declare function isAnyRoleIgnored(guildId: string, roleIds: string[], commandName?: string, moduleName?: string): Promise<boolean>;
export declare function addIgnore(guildId: string, entityType: 'user' | 'role' | 'channel' | 'category', entityId: string, scopeType: 'command' | 'module' | null, scopeId: string | null, mode?: 'wl' | 'bl'): Promise<void>;
export declare function removeIgnore(guildId: string, entityType: 'user' | 'role' | 'channel' | 'category', entityId: string, scopeType: 'command' | 'module' | null, scopeId: string | null, mode?: 'wl' | 'bl'): Promise<boolean>;
export declare function getIgnoreEntries(guildId: string): Promise<IgnoreRecord[]>;
//# sourceMappingURL=ignoreRepo.d.ts.map
import type { PermitRecord } from '../../../types/permission.js';
export declare function invalidatePermitCache(guildId: string): void;
export declare function getPermitsForGuild(guildId: string): Promise<PermitRecord[]>;
export declare function getPermits(guildId: string, commandName: string, moduleName: string): Promise<PermitRecord[]>;
export declare function hasPermit(guildId: string, userId: string, roleIds: string[], commandName: string, moduleName: string): Promise<boolean>;
export declare function addPermit(guildId: string, targetType: 'user' | 'role', targetId: string, commandName: string | null, moduleName: string | null): Promise<void>;
export declare function removePermit(guildId: string, targetType: 'user' | 'role', targetId: string, commandName: string | null, moduleName: string | null, revokedById?: string, revokedByName?: string): Promise<boolean>;
export declare function deletePermitsByIds(guildId: string, ids: number[]): Promise<number>;
export declare function removeAllPermitsForTarget(guildId: string, targetType: 'user' | 'role', targetId: string, revokedById?: string, revokedByName?: string): Promise<number>;
export declare function getLatestRevocation(guildId: string, userId: string, roleIds: string[], commandName: string, moduleName: string): Promise<{
    revokedByName: string;
    revokedAt: Date;
} | null>;
//# sourceMappingURL=permissionRepo.d.ts.map
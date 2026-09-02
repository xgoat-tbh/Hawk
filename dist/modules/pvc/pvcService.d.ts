export interface PvcSession {
    channelId: string;
    guildId: string;
    ownerId: string;
    expiresAt: Date;
    autoPayEnabled: boolean;
    isLocked: boolean;
    isHidden: boolean;
    userLimit: number;
}
export interface PvcAccessEntry {
    channelId: string;
    targetId: string;
    targetType: 'USER' | 'ROLE';
    access: 'ALLOW' | 'DENY';
}
export declare function createSession(channelId: string, guildId: string, ownerId: string, hours: number): Promise<PvcSession>;
export declare function getSession(channelId: string): Promise<PvcSession | null>;
export declare function getSessionByOwner(guildId: string, ownerId: string): Promise<PvcSession | null>;
export declare function extendSession(channelId: string, minutes: number): Promise<void>;
export declare function deleteSession(channelId: string): Promise<void>;
export declare function setAutoPayEnabled(channelId: string, enabled: boolean): Promise<void>;
export declare function setLocked(channelId: string, locked: boolean): Promise<void>;
export declare function setHidden(channelId: string, hidden: boolean): Promise<void>;
export declare function setUserLimit(channelId: string, limit: number): Promise<void>;
export declare function transferOwnership(channelId: string, newOwnerId: string): Promise<void>;
export declare function addAccess(channelId: string, targetId: string, targetType: 'USER' | 'ROLE', access: 'ALLOW' | 'DENY'): Promise<void>;
export declare function removeAccess(channelId: string, targetId: string): Promise<void>;
export declare function getAccessList(channelId: string): Promise<PvcAccessEntry[]>;
export declare function getExpiringSessionsForAutoPay(thresholdMinutes: number): Promise<PvcSession[]>;
export declare function getExpiredSessions(): Promise<PvcSession[]>;
export declare function getSessionsExpiringWithin(minutes: number): Promise<PvcSession[]>;
export declare function buyPvcTime(guildId: string, userId: string, hours: number, hourlyRate: number): Promise<{
    channelId?: string;
    extended: boolean;
}>;
//# sourceMappingURL=pvcService.d.ts.map
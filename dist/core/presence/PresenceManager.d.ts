import { Client, ActivityType, PresenceStatusData } from 'discord.js';
export type PresenceMode = 'auto' | 'rotating' | 'custom';
export interface CustomPresenceConfig {
    status: PresenceStatusData;
    activityType: ActivityType;
    activityText: string;
}
export declare class PresenceManager {
    private static instance;
    private client;
    private mode;
    private rotationIndex;
    private tickerInterval;
    private lastCommandTimestamp;
    private idleThresholdMs;
    private busyTasks;
    private customConfig;
    static getInstance(): PresenceManager;
    init(client: Client): void;
    setMode(mode: PresenceMode): void;
    getMode(): PresenceMode;
    getCustomConfig(): CustomPresenceConfig | null;
    setCustomPresence(status: PresenceStatusData, activityType: ActivityType, activityText: string): void;
    resetToAuto(): void;
    /** Called whenever a command is executed to reset the idle timer */
    recordActivity(): void;
    /** Register a heavy operation (e.g. shiftvc, purge) to trigger DND status */
    setBusy(taskId: string, description: string): void;
    /** Clear a busy operation */
    clearBusy(taskId: string): void;
    isBusy(): boolean;
    getBusyDescription(): string | null;
    isIdle(): boolean;
    getIdleTimeSeconds(): number;
    startTicker(): void;
    stopTicker(): void;
    update(): void;
}
export declare const presenceManager: PresenceManager;
//# sourceMappingURL=PresenceManager.d.ts.map
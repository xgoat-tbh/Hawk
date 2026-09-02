export interface Balance {
    cash: number;
    bank: number;
    bankCapacity: number;
    dailyLast: Date | null;
    dailyStreak: number;
    workLast: Date | null;
    slutLast: Date | null;
    crimeLast: Date | null;
    robLast: Date | null;
    passiveLast: Date | null;
}
export interface LeaderboardEntry {
    userId: string;
    cash: number;
    bank: number;
    netWorth: number;
    rank: number;
}
export interface DeductResult {
    deductedFromCash: number;
    deductedFromBank: number;
}
export declare function getBalance(guildId: string, userId: string): Promise<Balance>;
export declare function ensureBalance(guildId: string, userId: string): Promise<Balance>;
export declare function addCash(guildId: string, userId: string, amount: number): Promise<void>;
export declare function removeCash(guildId: string, userId: string, amount: number): Promise<boolean>;
export declare function addBank(guildId: string, userId: string, amount: number): Promise<void>;
export declare function removeBank(guildId: string, userId: string, amount: number): Promise<boolean>;
export declare function deposit(guildId: string, userId: string, amount: number): Promise<{
    deposited: number;
}>;
export declare function withdraw(guildId: string, userId: string, amount: number): Promise<{
    withdrawn: number;
}>;
export declare function transferCash(guildId: string, fromUserId: string, toUserId: string, amount: number): Promise<void>;
export declare function deductFundsPreferCash(guildId: string, userId: string, amount: number): Promise<DeductResult>;
export type LeaderboardSort = 'cash' | 'bank' | 'net';
export declare function getLeaderboard(guildId: string, sortBy?: LeaderboardSort, page?: number, pageSize?: number): Promise<{
    entries: LeaderboardEntry[];
    total: number;
}>;
export declare function resetUser(guildId: string, userId: string): Promise<void>;
export declare function resetEconomy(guildId: string): Promise<number>;
export declare function cleanLeaderboard(guildId: string): Promise<number>;
export declare function addMoneyToRole(guildId: string, memberIds: string[], amount: number, target: 'cash' | 'bank'): Promise<number>;
export declare function setCooldownTimestamp(guildId: string, userId: string, field: 'work_last' | 'slut_last' | 'crime_last' | 'rob_last' | 'passive_last'): Promise<void>;
export declare function logAuditAction(guildId: string, actorId: string, targetId: string | null, action: string, amount: number | null, details: string | null): Promise<void>;
export declare function getAuditLog(guildId: string, page?: number, pageSize?: number): Promise<{
    entries: Array<{
        actorId: string;
        targetId: string | null;
        action: string;
        amount: number | null;
        details: string | null;
        createdAt: Date;
    }>;
    total: number;
}>;
export declare function setBankCapacity(guildId: string, userId: string, capacity: number): Promise<void>;
export declare function setGuildDefaultBankCapacity(guildId: string, capacity: number): Promise<number>;
export interface DailyClaimResult {
    success: boolean;
    reward: number;
    streak: number;
    streakReset: boolean;
    nextClaimDate: Date;
    cooldownRemainingMs?: number;
}
export declare function claimDaily(guildId: string, userId: string): Promise<DailyClaimResult>;
export declare function formatCurrency(amount: number, symbol: string): string;
//# sourceMappingURL=economyService.d.ts.map
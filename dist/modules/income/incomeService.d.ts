export declare function checkCooldown(lastTime: Date | null, cooldownSeconds: number): {
    onCooldown: boolean;
    remaining: number;
};
export declare function executeWork(guildId: string, userId: string): Promise<{
    success: boolean;
    earned: number;
    message: string;
    cooldown?: number;
}>;
export declare function executeSlut(guildId: string, userId: string): Promise<{
    success: boolean;
    amount: number;
    message: string;
    cooldown?: number;
}>;
export declare function executeCrime(guildId: string, userId: string): Promise<{
    success: boolean;
    amount: number;
    message: string;
    cooldown?: number;
}>;
export declare function executeRob(guildId: string, attackerId: string, victimId: string): Promise<{
    success: boolean;
    amount: number;
    message: string;
    cooldown?: number;
    error?: string;
}>;
export declare function addIncomeRole(guildId: string, roleId: string, amount: number): Promise<void>;
export declare function removeIncomeRole(guildId: string, roleId: string): Promise<void>;
export declare function updateIncomeRole(guildId: string, roleId: string, amount: number): Promise<void>;
export declare function listIncomeRoles(guildId: string): Promise<Array<{
    roleId: string;
    incomeAmount: number;
}>>;
export declare function collectIncome(guildId: string, userId: string, memberRoleIds: string[]): Promise<{
    success: boolean;
    amount: number;
    cooldown?: number;
    message?: string;
}>;
export declare function forceUpdateIncome(guildId: string, roleId: string, memberIds: string[]): Promise<{
    amount: number;
    membersPaid: number;
}>;
//# sourceMappingURL=incomeService.d.ts.map
export interface EconomyConfig {
    guildId: string;
    currencySymbol: string;
    botCommanderRoleId: string | null;
    startBalance: number;
    dailyRewardAmount: number;
    dailyStreakBonus: number;
    minBet: number;
    maxBet: number;
    blackjackDecks: number;
    passiveIncome: boolean;
    passiveAmount: number;
    incomeReset: string;
    workCooldown: number;
    slutCooldown: number;
    crimeCooldown: number;
    robCooldown: number;
    auditChannelId: string | null;
    pvcHourlyRate: number;
    pvcJtcChannelId: string | null;
    pvcCategoryId: string | null;
    pvcCommandChannelId: string | null;
    pvcPanelChannelId: string | null;
    pvcMasterPanelMsgId: string | null;
}
declare const DEFAULTS: Omit<EconomyConfig, 'guildId'>;
export declare function getEconomyConfig(guildId: string): Promise<EconomyConfig>;
export declare function setEconomyConfigField(guildId: string, field: string, value: string | number | boolean | null): Promise<void>;
export declare function invalidateEconomyConfigCache(guildId: string): void;
export { DEFAULTS as ECONOMY_DEFAULTS };
//# sourceMappingURL=economyConfigRepo.d.ts.map
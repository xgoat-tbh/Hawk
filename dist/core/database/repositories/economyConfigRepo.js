import { getDb } from '../pool.js';
// ── Cache ─────────────────────────────────────────────────────
const configCache = new Map();
const DEFAULTS = {
    currencySymbol: '$',
    botCommanderRoleId: null,
    startBalance: 0,
    dailyRewardAmount: 1000,
    dailyStreakBonus: 100,
    minBet: 10,
    maxBet: 50000,
    blackjackDecks: 6,
    passiveIncome: false,
    passiveAmount: 1,
    incomeReset: '24h',
    workCooldown: 30,
    slutCooldown: 45,
    crimeCooldown: 60,
    robCooldown: 120,
    auditChannelId: null,
    pvcHourlyRate: 100,
    pvcJtcChannelId: null,
    pvcCategoryId: null,
    pvcCommandChannelId: null,
    pvcPanelChannelId: null,
    pvcMasterPanelMsgId: null,
};
// ── Row Mapper ────────────────────────────────────────────────
function mapRow(row) {
    return {
        guildId: row.guild_id,
        currencySymbol: row.currency_symbol ?? DEFAULTS.currencySymbol,
        botCommanderRoleId: row.bot_commander_role_id ?? null,
        startBalance: Number(row.start_balance ?? DEFAULTS.startBalance),
        dailyRewardAmount: Number(row.daily_reward_amount ?? DEFAULTS.dailyRewardAmount),
        dailyStreakBonus: Number(row.daily_streak_bonus ?? DEFAULTS.dailyStreakBonus),
        minBet: Number(row.min_bet ?? DEFAULTS.minBet),
        maxBet: Number(row.max_bet ?? DEFAULTS.maxBet),
        blackjackDecks: Number(row.blackjack_decks ?? DEFAULTS.blackjackDecks),
        passiveIncome: row.passive_income ?? DEFAULTS.passiveIncome,
        passiveAmount: Number(row.passive_amount ?? DEFAULTS.passiveAmount),
        incomeReset: row.income_reset ?? DEFAULTS.incomeReset,
        workCooldown: Number(row.work_cooldown ?? DEFAULTS.workCooldown),
        slutCooldown: Number(row.slut_cooldown ?? DEFAULTS.slutCooldown),
        crimeCooldown: Number(row.crime_cooldown ?? DEFAULTS.crimeCooldown),
        robCooldown: Number(row.rob_cooldown ?? DEFAULTS.robCooldown),
        auditChannelId: row.audit_channel_id ?? null,
        pvcHourlyRate: Number(row.pvc_hourly_rate ?? DEFAULTS.pvcHourlyRate),
        pvcJtcChannelId: row.pvc_jtc_channel_id ?? null,
        pvcCategoryId: row.pvc_category_id ?? null,
        pvcCommandChannelId: row.pvc_command_channel_id ?? null,
        pvcPanelChannelId: row.pvc_panel_channel_id ?? null,
        pvcMasterPanelMsgId: row.pvc_master_panel_msg_id ?? null,
    };
}
// ── Queries ───────────────────────────────────────────────────
export async function getEconomyConfig(guildId) {
    const cached = configCache.get(guildId);
    if (cached)
        return cached;
    const db = getDb();
    const rows = await db `SELECT * FROM economy_config WHERE guild_id = ${guildId}`;
    if (rows.length === 0) {
        const config = { guildId, ...DEFAULTS };
        configCache.set(guildId, config);
        return config;
    }
    const config = mapRow(rows[0]);
    if (configCache.size >= 5000) {
        const firstKey = configCache.keys().next().value;
        if (firstKey !== undefined)
            configCache.delete(firstKey);
    }
    configCache.set(guildId, config);
    return config;
}
export async function setEconomyConfigField(guildId, field, value) {
    const db = getDb();
    const ALLOWED_FIELDS = {
        currencySymbol: 'currency_symbol',
        botCommanderRoleId: 'bot_commander_role_id',
        startBalance: 'start_balance',
        dailyRewardAmount: 'daily_reward_amount',
        dailyStreakBonus: 'daily_streak_bonus',
        minBet: 'min_bet',
        maxBet: 'max_bet',
        blackjackDecks: 'blackjack_decks',
        passiveIncome: 'passive_income',
        passiveAmount: 'passive_amount',
        incomeReset: 'income_reset',
        workCooldown: 'work_cooldown',
        slutCooldown: 'slut_cooldown',
        crimeCooldown: 'crime_cooldown',
        robCooldown: 'rob_cooldown',
        auditChannelId: 'audit_channel_id',
        pvcHourlyRate: 'pvc_hourly_rate',
        pvcJtcChannelId: 'pvc_jtc_channel_id',
        pvcCategoryId: 'pvc_category_id',
        pvcCommandChannelId: 'pvc_command_channel_id',
        pvcPanelChannelId: 'pvc_panel_channel_id',
        pvcMasterPanelMsgId: 'pvc_master_panel_msg_id',
    };
    const dbColumn = ALLOWED_FIELDS[field];
    if (!dbColumn)
        throw new Error(`Unknown economy config field: ${field}`);
    await db `
    INSERT INTO economy_config (guild_id, ${db(dbColumn)})
    VALUES (${guildId}, ${value})
    ON CONFLICT (guild_id)
    DO UPDATE SET ${db(dbColumn)} = ${value}, updated_at = NOW()
  `;
    invalidateEconomyConfigCache(guildId);
}
export function invalidateEconomyConfigCache(guildId) {
    configCache.delete(guildId);
}
export { DEFAULTS as ECONOMY_DEFAULTS };
//# sourceMappingURL=economyConfigRepo.js.map
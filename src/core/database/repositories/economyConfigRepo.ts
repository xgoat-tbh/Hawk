import { getDb } from '../pool.js';

// ── Types ─────────────────────────────────────────────────────

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

// ── Cache ─────────────────────────────────────────────────────

const configCache = new Map<string, EconomyConfig>();

const DEFAULTS: Omit<EconomyConfig, 'guildId'> = {
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

function mapRow(row: Record<string, unknown>): EconomyConfig {
  return {
    guildId: row.guild_id as string,
    currencySymbol: (row.currency_symbol as string) ?? DEFAULTS.currencySymbol,
    botCommanderRoleId: (row.bot_commander_role_id as string) ?? null,
    startBalance: Number(row.start_balance ?? DEFAULTS.startBalance),
    dailyRewardAmount: Number(row.daily_reward_amount ?? DEFAULTS.dailyRewardAmount),
    dailyStreakBonus: Number(row.daily_streak_bonus ?? DEFAULTS.dailyStreakBonus),
    minBet: Number(row.min_bet ?? DEFAULTS.minBet),
    maxBet: Number(row.max_bet ?? DEFAULTS.maxBet),
    blackjackDecks: Number(row.blackjack_decks ?? DEFAULTS.blackjackDecks),
    passiveIncome: (row.passive_income as boolean) ?? DEFAULTS.passiveIncome,
    passiveAmount: Number(row.passive_amount ?? DEFAULTS.passiveAmount),
    incomeReset: (row.income_reset as string) ?? DEFAULTS.incomeReset,
    workCooldown: Number(row.work_cooldown ?? DEFAULTS.workCooldown),
    slutCooldown: Number(row.slut_cooldown ?? DEFAULTS.slutCooldown),
    crimeCooldown: Number(row.crime_cooldown ?? DEFAULTS.crimeCooldown),
    robCooldown: Number(row.rob_cooldown ?? DEFAULTS.robCooldown),
    auditChannelId: (row.audit_channel_id as string) ?? null,
    pvcHourlyRate: Number(row.pvc_hourly_rate ?? DEFAULTS.pvcHourlyRate),
    pvcJtcChannelId: (row.pvc_jtc_channel_id as string) ?? null,
    pvcCategoryId: (row.pvc_category_id as string) ?? null,
    pvcCommandChannelId: (row.pvc_command_channel_id as string) ?? null,
    pvcPanelChannelId: (row.pvc_panel_channel_id as string) ?? null,
    pvcMasterPanelMsgId: (row.pvc_master_panel_msg_id as string) ?? null,
  };
}

// ── Queries ───────────────────────────────────────────────────

export async function getEconomyConfig(guildId: string): Promise<EconomyConfig> {
  const cached = configCache.get(guildId);
  if (cached) return cached;

  const db = getDb();
  const rows = await db`SELECT * FROM economy_config WHERE guild_id = ${guildId}`;

  if (rows.length === 0) {
    const config: EconomyConfig = { guildId, ...DEFAULTS };
    configCache.set(guildId, config);
    return config;
  }

  const config = mapRow(rows[0]);
  if (configCache.size >= 5000) {
    const firstKey = configCache.keys().next().value;
    if (firstKey !== undefined) configCache.delete(firstKey);
  }
  configCache.set(guildId, config);
  return config;
}

export async function setEconomyConfigField(
  guildId: string,
  field: string,
  value: string | number | boolean | null,
): Promise<void> {
  const db = getDb();

  const ALLOWED_FIELDS: Record<string, string> = {
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
  if (!dbColumn) throw new Error(`Unknown economy config field: ${field}`);

  await db`
    INSERT INTO economy_config (guild_id, ${db(dbColumn)})
    VALUES (${guildId}, ${value as string})
    ON CONFLICT (guild_id)
    DO UPDATE SET ${db(dbColumn)} = ${value as string}, updated_at = NOW()
  `;

  invalidateEconomyConfigCache(guildId);
}

export function invalidateEconomyConfigCache(guildId: string): void {
  configCache.delete(guildId);
}

export { DEFAULTS as ECONOMY_DEFAULTS };

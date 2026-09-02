import { getDb } from '../../core/database/pool.js';
import { getEconomyConfig } from '../../core/database/repositories/economyConfigRepo.js';

// ── Types ─────────────────────────────────────────────────────

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

// ── Row Mapper ────────────────────────────────────────────────

function mapBalance(row: Record<string, unknown>): Balance {
  return {
    cash: Number(row.cash ?? 0),
    bank: Number(row.bank ?? 0),
    bankCapacity: Number(row.bank_capacity ?? 0),
    dailyLast: row.daily_last ? new Date(row.daily_last as string) : null,
    dailyStreak: Number(row.daily_streak ?? 0),
    workLast: row.work_last ? new Date(row.work_last as string) : null,
    slutLast: row.slut_last ? new Date(row.slut_last as string) : null,
    crimeLast: row.crime_last ? new Date(row.crime_last as string) : null,
    robLast: row.rob_last ? new Date(row.rob_last as string) : null,
    passiveLast: row.passive_last ? new Date(row.passive_last as string) : null,
  };
}

// ── Queries ───────────────────────────────────────────────────

export async function getBalance(guildId: string, userId: string): Promise<Balance> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM economy_balances WHERE guild_id = ${guildId} AND user_id = ${userId}
  `;
  if (rows.length === 0) {
    return { cash: 0, bank: 0, bankCapacity: 0, dailyLast: null, dailyStreak: 0, workLast: null, slutLast: null, crimeLast: null, robLast: null, passiveLast: null };
  }
  return mapBalance(rows[0]);
}

export async function ensureBalance(guildId: string, userId: string): Promise<Balance> {
  const db = getDb();
  const config = await getEconomyConfig(guildId);

  const rows = await db`
    INSERT INTO economy_balances (guild_id, user_id, cash, bank_capacity)
    VALUES (${guildId}, ${userId}, ${config.startBalance}, 0)
    ON CONFLICT (guild_id, user_id) DO NOTHING
    RETURNING *
  `;

  if (rows.length > 0) return mapBalance(rows[0]);
  return getBalance(guildId, userId);
}

export async function addCash(guildId: string, userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const db = getDb();
  await db.begin(async (tx) => {
    await tx`
      INSERT INTO economy_balances (guild_id, user_id, cash)
      VALUES (${guildId}, ${userId}, ${amount})
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET cash = economy_balances.cash + ${amount}, updated_at = NOW()
    `;
  });
}

export async function removeCash(guildId: string, userId: string, amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  const db = getDb();
  return await db.begin(async (tx) => {
    const rows = await tx`
      UPDATE economy_balances
      SET cash = cash - ${amount}, updated_at = NOW()
      WHERE guild_id = ${guildId} AND user_id = ${userId} AND cash >= ${amount}
      RETURNING cash
    `;
    return rows.length > 0;
  });
}

export async function addBank(guildId: string, userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const db = getDb();
  await db.begin(async (tx) => {
    await tx`
      INSERT INTO economy_balances (guild_id, user_id, bank, bank_capacity)
      VALUES (${guildId}, ${userId}, ${amount}, 0)
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET bank = CASE 
        WHEN economy_balances.bank_capacity > 0 THEN LEAST(economy_balances.bank + ${amount}, economy_balances.bank_capacity)
        ELSE economy_balances.bank + ${amount}
      END, updated_at = NOW()
    `;
  });
}

export async function removeBank(guildId: string, userId: string, amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  const db = getDb();
  return await db.begin(async (tx) => {
    const rows = await tx`
      UPDATE economy_balances
      SET bank = bank - ${amount}, updated_at = NOW()
      WHERE guild_id = ${guildId} AND user_id = ${userId} AND bank >= ${amount}
      RETURNING bank
    `;
    return rows.length > 0;
  });
}

export async function deposit(guildId: string, userId: string, amount: number): Promise<{ deposited: number }> {
  const db = getDb();
  return await db.begin(async (tx) => {
    const rows = await tx`
      SELECT cash, bank, bank_capacity FROM economy_balances
      WHERE guild_id = ${guildId} AND user_id = ${userId}
      FOR UPDATE
    `;
    if (rows.length === 0) throw new Error('No balance record found');
    const bal = rows[0];
    const cash = Number(bal.cash);
    const bank = Number(bal.bank);
    const cap = Number(bal.bank_capacity);

    const maxDeposit = cap > 0 ? Math.min(amount, cash, Math.max(0, cap - bank)) : Math.min(amount, cash);
    if (maxDeposit <= 0) throw new Error('Nothing to deposit');

    await tx`
      UPDATE economy_balances
      SET cash = cash - ${maxDeposit}, bank = bank + ${maxDeposit}, updated_at = NOW()
      WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;
    return { deposited: maxDeposit };
  });
}

export async function withdraw(guildId: string, userId: string, amount: number): Promise<{ withdrawn: number }> {
  const db = getDb();
  return await db.begin(async (tx) => {
    const rows = await tx`
      SELECT cash, bank FROM economy_balances
      WHERE guild_id = ${guildId} AND user_id = ${userId}
      FOR UPDATE
    `;
    if (rows.length === 0) throw new Error('No balance record found');
    const bank = Number(rows[0].bank);

    const maxWithdraw = Math.min(amount, bank);
    if (maxWithdraw <= 0) throw new Error('Nothing to withdraw');

    await tx`
      UPDATE economy_balances
      SET cash = cash + ${maxWithdraw}, bank = bank - ${maxWithdraw}, updated_at = NOW()
      WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;
    return { withdrawn: maxWithdraw };
  });
}

export async function transferCash(guildId: string, fromUserId: string, toUserId: string, amount: number): Promise<void> {
  if (amount <= 0) throw new Error('Amount must be positive');
  const db = getDb();
  await db.begin(async (tx) => {
    // Lock both rows in consistent order to prevent deadlocks
    const [id1, id2] = fromUserId < toUserId ? [fromUserId, toUserId] : [toUserId, fromUserId];
    await tx`
      SELECT 1 FROM economy_balances
      WHERE guild_id = ${guildId} AND user_id IN (${id1}, ${id2})
      ORDER BY user_id
      FOR UPDATE
    `;

    const senderRows = await tx`
      UPDATE economy_balances
      SET cash = cash - ${amount}, updated_at = NOW()
      WHERE guild_id = ${guildId} AND user_id = ${fromUserId} AND cash >= ${amount}
      RETURNING cash
    `;
    if (senderRows.length === 0) throw new Error('Insufficient cash');

    await tx`
      INSERT INTO economy_balances (guild_id, user_id, cash)
      VALUES (${guildId}, ${toUserId}, ${amount})
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET cash = economy_balances.cash + ${amount}, updated_at = NOW()
    `;
  });
}

export async function deductFundsPreferCash(guildId: string, userId: string, amount: number): Promise<DeductResult> {
  if (amount <= 0) return { deductedFromCash: 0, deductedFromBank: 0 };
  const db = getDb();
  return await db.begin(async (tx) => {
    const rows = await tx`
      SELECT cash, bank FROM economy_balances
      WHERE guild_id = ${guildId} AND user_id = ${userId}
      FOR UPDATE
    `;
    if (rows.length === 0) throw new Error('No balance record found');
    const cash = Number(rows[0].cash);
    const bank = Number(rows[0].bank);
    const total = cash + bank;

    if (total < amount) throw new Error('Insufficient funds');

    const fromCash = Math.min(cash, amount);
    const fromBank = amount - fromCash;

    await tx`
      UPDATE economy_balances
      SET cash = cash - ${fromCash}, bank = bank - ${fromBank}, updated_at = NOW()
      WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;
    return { deductedFromCash: fromCash, deductedFromBank: fromBank };
  });
}

export type LeaderboardSort = 'cash' | 'bank' | 'net';

export async function getLeaderboard(
  guildId: string,
  sortBy: LeaderboardSort = 'net',
  page: number = 1,
  pageSize: number = 10,
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  const countRows = await db`
    SELECT COUNT(*)::int as total FROM economy_balances
    WHERE guild_id = ${guildId} AND (cash > 0 OR bank > 0)
  `;
  const total = countRows[0]?.total ?? 0;

  let orderClause: string;
  switch (sortBy) {
    case 'cash':
      orderClause = 'cash DESC';
      break;
    case 'bank':
      orderClause = 'bank DESC';
      break;
    default:
      orderClause = '(cash + bank) DESC';
  }

  const rows = await db.unsafe(
    `SELECT user_id, cash, bank, (cash + bank) as net_worth,
     ROW_NUMBER() OVER (ORDER BY ${orderClause}) as rank
     FROM economy_balances
     WHERE guild_id = $1 AND (cash > 0 OR bank > 0)
     ORDER BY ${orderClause}
     LIMIT $2 OFFSET $3`,
    [guildId, pageSize, offset],
  );

  const entries: LeaderboardEntry[] = rows.map((r: Record<string, unknown>) => ({
    userId: r.user_id as string,
    cash: Number(r.cash),
    bank: Number(r.bank),
    netWorth: Number(r.net_worth),
    rank: Number(r.rank),
  }));

  return { entries, total };
}

export async function resetUser(guildId: string, userId: string): Promise<void> {
  const db = getDb();
  await db`DELETE FROM economy_balances WHERE guild_id = ${guildId} AND user_id = ${userId}`;
}

export async function resetEconomy(guildId: string): Promise<number> {
  const db = getDb();
  const rows = await db`DELETE FROM economy_balances WHERE guild_id = ${guildId} RETURNING user_id`;
  return rows.length;
}

export async function cleanLeaderboard(guildId: string): Promise<number> {
  const db = getDb();
  const rows = await db`
    DELETE FROM economy_balances
    WHERE guild_id = ${guildId} AND cash = 0 AND bank = 0
    RETURNING user_id
  `;
  return rows.length;
}

export async function addMoneyToRole(
  guildId: string,
  memberIds: string[],
  amount: number,
  target: 'cash' | 'bank',
): Promise<number> {
  if (memberIds.length === 0 || amount === 0) return 0;
  const db = getDb();
  let updated = 0;
  await db.begin(async (tx) => {
    for (const userId of memberIds) {
      if (target === 'cash') {
        await tx`
          INSERT INTO economy_balances (guild_id, user_id, cash)
          VALUES (${guildId}, ${userId}, ${Math.max(0, amount)})
          ON CONFLICT (guild_id, user_id)
          DO UPDATE SET cash = GREATEST(0, economy_balances.cash + ${amount}), updated_at = NOW()
        `;
      } else {
        await tx`
          INSERT INTO economy_balances (guild_id, user_id, bank, bank_capacity)
          VALUES (${guildId}, ${userId}, ${Math.max(0, amount)}, 0)
          ON CONFLICT (guild_id, user_id)
          DO UPDATE SET bank = CASE
            WHEN economy_balances.bank_capacity > 0 THEN GREATEST(0, LEAST(economy_balances.bank + ${amount}, economy_balances.bank_capacity))
            ELSE GREATEST(0, economy_balances.bank + ${amount})
          END, updated_at = NOW()
        `;
      }
      updated++;
    }
  });
  return updated;
}

export async function setCooldownTimestamp(
  guildId: string,
  userId: string,
  field: 'work_last' | 'slut_last' | 'crime_last' | 'rob_last' | 'passive_last',
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE economy_balances
    SET ${db(field)} = NOW(), updated_at = NOW()
    WHERE guild_id = ${guildId} AND user_id = ${userId}
  `;
}

// ── Audit Logging ─────────────────────────────────────────────

export async function logAuditAction(
  guildId: string,
  actorId: string,
  targetId: string | null,
  action: string,
  amount: number | null,
  details: string | null,
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO economy_audit_log (guild_id, actor_id, target_id, action, amount, details)
    VALUES (${guildId}, ${actorId}, ${targetId}, ${action}, ${amount}, ${details})
  `;
}

export async function getAuditLog(
  guildId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ entries: Array<{ actorId: string; targetId: string | null; action: string; amount: number | null; details: string | null; createdAt: Date }>; total: number }> {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  const countRows = await db`SELECT COUNT(*)::int as total FROM economy_audit_log WHERE guild_id = ${guildId}`;
  const total = countRows[0]?.total ?? 0;

  const rows = await db`
    SELECT actor_id, target_id, action, amount, details, created_at
    FROM economy_audit_log
    WHERE guild_id = ${guildId}
    ORDER BY created_at DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  return {
    entries: rows.map((r: Record<string, unknown>) => ({
      actorId: r.actor_id as string,
      targetId: (r.target_id as string) ?? null,
      action: r.action as string,
      amount: r.amount != null ? Number(r.amount) : null,
      details: (r.details as string) ?? null,
      createdAt: new Date(r.created_at as string),
    })),
    total,
  };
}

export async function setBankCapacity(guildId: string, userId: string, capacity: number): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO economy_balances (guild_id, user_id, bank_capacity)
    VALUES (${guildId}, ${userId}, ${Math.max(0, capacity)})
    ON CONFLICT (guild_id, user_id)
    DO UPDATE SET bank_capacity = ${Math.max(0, capacity)}, updated_at = NOW()
  `;
}

export async function setGuildDefaultBankCapacity(guildId: string, capacity: number): Promise<number> {
  const db = getDb();
  const rows = await db`
    UPDATE economy_balances
    SET bank_capacity = ${Math.max(0, capacity)}, updated_at = NOW()
    WHERE guild_id = ${guildId}
    RETURNING user_id
  `;
  return rows.length;
}

export interface DailyClaimResult {
  success: boolean;
  reward: number;
  streak: number;
  streakReset: boolean;
  nextClaimDate: Date;
  cooldownRemainingMs?: number;
}

export async function claimDaily(guildId: string, userId: string): Promise<DailyClaimResult> {
  const db = getDb();
  const config = await getEconomyConfig(guildId);
  const now = new Date();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

  return await db.begin(async (tx) => {
    const rows = await tx`
      SELECT * FROM economy_balances
      WHERE guild_id = ${guildId} AND user_id = ${userId}
      FOR UPDATE
    `;

    let currentStreak = 0;
    let lastClaim: Date | null = null;

    if (rows.length > 0) {
      currentStreak = Number(rows[0].daily_streak ?? 0);
      lastClaim = rows[0].daily_last ? new Date(rows[0].daily_last as string) : null;
    }

    if (lastClaim) {
      const elapsed = now.getTime() - lastClaim.getTime();
      if (elapsed < ONE_DAY_MS) {
        const nextClaim = new Date(lastClaim.getTime() + ONE_DAY_MS);
        return {
          success: false,
          reward: 0,
          streak: currentStreak,
          streakReset: false,
          nextClaimDate: nextClaim,
          cooldownRemainingMs: ONE_DAY_MS - elapsed,
        };
      }
    }

    // Evaluate streak: if within 48h, streak + 1; otherwise reset to 1
    let newStreak = 1;
    let streakReset = false;
    if (lastClaim) {
      const elapsed = now.getTime() - lastClaim.getTime();
      if (elapsed <= TWO_DAYS_MS) {
        newStreak = currentStreak + 1;
      } else {
        streakReset = true;
        newStreak = 1;
      }
    }

    // Base reward + streak bonus (capped at max 30-day streak bonus)
    const effectiveStreak = Math.min(newStreak, 30);
    const baseReward = config.dailyRewardAmount;
    const streakBonus = (effectiveStreak - 1) * config.dailyStreakBonus;
    const totalReward = baseReward + streakBonus;

    await tx`
      INSERT INTO economy_balances (guild_id, user_id, cash, daily_last, daily_streak)
      VALUES (${guildId}, ${userId}, ${config.startBalance + totalReward}, ${now}, ${newStreak})
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET
        cash = economy_balances.cash + ${totalReward},
        daily_last = ${now},
        daily_streak = ${newStreak},
        updated_at = NOW()
    `;

    const nextClaimDate = new Date(now.getTime() + ONE_DAY_MS);
    return {
      success: true,
      reward: totalReward,
      streak: newStreak,
      streakReset,
      nextClaimDate,
    };
  });
}

export function formatCurrency(amount: number, symbol: string): string {
  return `${symbol} ${amount.toLocaleString()}`;
}



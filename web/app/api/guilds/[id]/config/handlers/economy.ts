import { db } from '@/lib/db';
import { cleanString, cleanInt, HandlerResult } from '../helpers';

export async function handleEconomy(guildId: string, data: any): Promise<HandlerResult> {
  const currency_symbol = cleanString(data.currency_symbol, 5) || '$';
  const start_balance = cleanInt(data.start_balance, 0, 1_000_000_000, 0);
  const daily_reward_amount = cleanInt(data.daily_reward_amount, 0, 1_000_000_000, 1000);
  const daily_streak_bonus = cleanInt(data.daily_streak_bonus, 0, 1_000_000_000, 100);
  const passive_income = Boolean(data.passive_income);
  const passive_amount = cleanInt(data.passive_amount, 1, 1_000_000, 10);

  await db`
    INSERT INTO economy_config (
      guild_id,
      currency_symbol,
      start_balance,
      daily_reward_amount,
      daily_streak_bonus,
      passive_income,
      passive_amount
    )
    VALUES (
      ${guildId},
      ${currency_symbol},
      ${start_balance},
      ${daily_reward_amount},
      ${daily_streak_bonus},
      ${passive_income},
      ${passive_amount}
    )
    ON CONFLICT (guild_id)
    DO UPDATE SET
      currency_symbol = EXCLUDED.currency_symbol,
      start_balance = EXCLUDED.start_balance,
      daily_reward_amount = EXCLUDED.daily_reward_amount,
      daily_streak_bonus = EXCLUDED.daily_streak_bonus,
      passive_income = EXCLUDED.passive_income,
      passive_amount = EXCLUDED.passive_amount,
      updated_at = NOW()
  `;

  return {
    success: true,
    data: {
      currency_symbol,
      start_balance,
      daily_reward_amount,
      daily_streak_bonus,
      passive_income,
      passive_amount,
    },
  };
}

import { db } from '@/lib/db';
import { cleanString, cleanInt, HandlerResult } from '../helpers';
export async function handleEconomy(guildId: string, data: any): Promise<HandlerResult> {
  const patch: Record<string, string | number | boolean> = {};
  const numbers: Record<string, [number, number, number]> = { start_balance: [0, 1000000000, 0], daily_reward_amount: [0, 1000000000, 1000], daily_streak_bonus: [0, 1000000000, 100], passive_amount: [1, 1000000, 10] };
  for (const [field, limits] of Object.entries(numbers)) if (Object.hasOwn(data, field)) patch[field] = cleanInt(data[field], ...limits);
  if (Object.hasOwn(data, 'currency_symbol')) patch.currency_symbol = cleanString(data.currency_symbol, 5) || '$';
  if (Object.hasOwn(data, 'passive_income')) patch.passive_income = Boolean(data.passive_income);
  if (Object.hasOwn(data, 'income_reset')) {
    if (typeof data.income_reset !== 'string' || !/^[1-9]\d{0,3}(m|h|d)$/.test(data.income_reset)) return { success: false, error: 'Use a positive payout duration, such as 12h or 1d.', status: 400 };
    patch.income_reset = data.income_reset;
  }
  if (!Object.keys(patch).length) return { success: false, error: 'No supported economy fields supplied.', status: 400 };
  const result = await db.begin(async sql => {
    await sql`INSERT INTO economy_config (guild_id) VALUES (${guildId}) ON CONFLICT (guild_id) DO NOTHING`;
    const rows = await sql`UPDATE economy_config SET ${sql(patch)}, updated_at = NOW() WHERE guild_id = ${guildId} RETURNING *`;
    return rows[0];
  });
  return { success: true, data: result };
}

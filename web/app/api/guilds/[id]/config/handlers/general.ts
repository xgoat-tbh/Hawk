import { db } from '@/lib/db';
import { cleanSnowflake, HandlerResult } from '../helpers';

export async function handleGeneral(guildId: string, data: any): Promise<HandlerResult> {
  const general: Record<string, string | null> = {};
  const economy: Record<string, string | null> = {};
  if (Object.hasOwn(data, 'prefix')) {
    if (typeof data.prefix !== 'string' || !/^\S{1,5}$/u.test(data.prefix)) return { success: false, error: 'Prefix must contain 1–5 characters without spaces', status: 400 };
    general.prefix = data.prefix;
  }
  for (const field of ['log_channel_id', 'audit_channel_id', 'bot_commander_role_id']) {
    if (!Object.hasOwn(data, field)) continue;
    const value = cleanSnowflake(data[field]);
    if (data[field] !== null && data[field] !== '' && !value) return { success: false, error: `Invalid ${field}`, status: 400 };
    (field === 'log_channel_id' ? general : economy)[field] = value;
  }
  if (!Object.keys(general).length && !Object.keys(economy).length) return { success: false, error: 'No supported general fields supplied', status: 400 };
  const result = await db.begin(async tx => {
    let saved = {};
    if (Object.keys(general).length) {
      await tx`INSERT INTO guild_config (guild_id) VALUES (${guildId}) ON CONFLICT (guild_id) DO NOTHING`;
      const rows = await tx`UPDATE guild_config SET ${tx(general)}, updated_at = NOW() WHERE guild_id = ${guildId} RETURNING *`;
      saved = { ...rows[0] };
    }
    if (Object.keys(economy).length) {
      await tx`INSERT INTO economy_config (guild_id) VALUES (${guildId}) ON CONFLICT (guild_id) DO NOTHING`;
      await tx`UPDATE economy_config SET ${tx(economy)}, updated_at = NOW() WHERE guild_id = ${guildId}`;
    }
    return { ...saved, ...economy };
  });
  return { success: true, data: result };
}

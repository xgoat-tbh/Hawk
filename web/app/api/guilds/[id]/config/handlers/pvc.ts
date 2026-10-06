import { db } from '@/lib/db';
import { cleanSnowflake, cleanInt, HandlerResult } from '../helpers';

export async function handlePvc(guildId: string, data: any): Promise<HandlerResult> {
  const patch: Record<string, string | number | boolean | null> = {};
  if (Object.hasOwn(data, 'pvc_hourly_rate')) patch.pvc_hourly_rate = cleanInt(data.pvc_hourly_rate, 0, 1_000_000, 100);
  for (const field of ['pvc_jtc_channel_id', 'pvc_category_id', 'pvc_command_channel_id', 'pvc_panel_channel_id']) {
    if (!Object.hasOwn(data, field)) continue;
    const value = cleanSnowflake(data[field]);
    if (data[field] !== null && data[field] !== '' && !value) return { success: false, error: `Invalid ${field}`, status: 400 };
    patch[field] = value;
  }
  if (Object.hasOwn(data, 'auto_cleanup')) {
    if (typeof data.auto_cleanup !== 'boolean') return { success: false, error: 'Auto cleanup must be a boolean', status: 400 };
    patch.auto_cleanup = data.auto_cleanup;
  }
  if (!Object.keys(patch).length) return { success: false, error: 'No supported PVC fields supplied', status: 400 };
  const result = await db.begin(async tx => {
    await tx`INSERT INTO economy_config (guild_id) VALUES (${guildId}) ON CONFLICT (guild_id) DO NOTHING`;
    return (await tx`UPDATE economy_config SET ${tx(patch)}, updated_at = NOW() WHERE guild_id = ${guildId} RETURNING *`)[0];
  });
  return { success: true, data: result };
}

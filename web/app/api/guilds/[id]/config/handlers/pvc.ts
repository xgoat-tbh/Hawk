import { db } from '@/lib/db';
import { cleanSnowflake, cleanInt, HandlerResult } from '../helpers';

export async function handlePvc(guildId: string, data: any): Promise<HandlerResult> {
  const pvc_hourly_rate = cleanInt(data.pvc_hourly_rate, 0, 1_000_000, 100);
  const pvc_jtc_channel_id = cleanSnowflake(data.pvc_jtc_channel_id);
  const pvc_category_id = cleanSnowflake(data.pvc_category_id);
  const pvc_command_channel_id = cleanSnowflake(data.pvc_command_channel_id);
  const pvc_panel_channel_id = cleanSnowflake(data.pvc_panel_channel_id);

  await db`
    INSERT INTO economy_config (
      guild_id,
      pvc_hourly_rate,
      pvc_jtc_channel_id,
      pvc_category_id,
      pvc_command_channel_id,
      pvc_panel_channel_id
    )
    VALUES (
      ${guildId},
      ${pvc_hourly_rate},
      ${pvc_jtc_channel_id},
      ${pvc_category_id},
      ${pvc_command_channel_id},
      ${pvc_panel_channel_id}
    )
    ON CONFLICT (guild_id)
    DO UPDATE SET
      pvc_hourly_rate = EXCLUDED.pvc_hourly_rate,
      pvc_jtc_channel_id = EXCLUDED.pvc_jtc_channel_id,
      pvc_category_id = EXCLUDED.pvc_category_id,
      pvc_command_channel_id = EXCLUDED.pvc_command_channel_id,
      pvc_panel_channel_id = EXCLUDED.pvc_panel_channel_id,
      updated_at = NOW()
  `;

  return {
    success: true,
    data: {
      pvc_hourly_rate,
      pvc_jtc_channel_id,
      pvc_category_id,
      pvc_command_channel_id,
      pvc_panel_channel_id,
    },
  };
}

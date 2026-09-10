import { db } from '@/lib/db';
import { cleanSnowflake, HandlerResult } from '../helpers';

export async function handleMedia(guildId: string, module: string, data: any): Promise<HandlerResult> {
  if (module === 'media_add') {
    const channel_id = cleanSnowflake(data.channel_id);
    if (channel_id) {
      await db`
        INSERT INTO media_channels (guild_id, channel_id)
        VALUES (${guildId}, ${channel_id})
        ON CONFLICT (guild_id, channel_id) DO NOTHING
      `;
    }
    return { success: true, data: { channel_id } };
  }

  if (module === 'media_delete') {
    const channel_id = cleanSnowflake(data.channel_id);
    if (channel_id) {
      await db`DELETE FROM media_channels WHERE guild_id = ${guildId} AND channel_id = ${channel_id}`;
    }
    return { success: true, data: { channel_id, deleted: true } };
  }

  if (module === 'media_set_autothread') {
    const auto_thread = Boolean(data.auto_thread);
    await db`
      INSERT INTO media_guild_configs (guild_id, auto_thread)
      VALUES (${guildId}, ${auto_thread})
      ON CONFLICT (guild_id)
      DO UPDATE SET auto_thread = EXCLUDED.auto_thread, updated_at = NOW()
    `;
    return { success: true, data: { auto_thread } };
  }

  return { success: false, error: `Unsupported media action: ${module}`, status: 400 };
}

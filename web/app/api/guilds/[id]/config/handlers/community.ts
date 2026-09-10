import { db } from '@/lib/db';
import { cleanSnowflake, HandlerResult } from '../helpers';

export async function handleCommunity(guildId: string, data: any): Promise<HandlerResult> {
  const { suggestion, confession } = data;
  const sugChannel = cleanSnowflake(suggestion?.submission_channel_id);
  if (sugChannel) {
    await db`
      INSERT INTO suggestion_configs (guild_id, channel_id)
      VALUES (${guildId}, ${sugChannel})
      ON CONFLICT (guild_id)
      DO UPDATE SET
        channel_id = EXCLUDED.channel_id,
        updated_at = NOW()
    `;
  }

  const confChannel = cleanSnowflake(confession?.submission_channel_id);
  const confLog = cleanSnowflake(confession?.log_channel_id);
  if (confChannel) {
    await db`
      INSERT INTO confession_configs (guild_id, channel_id, log_channel_id)
      VALUES (${guildId}, ${confChannel}, ${confLog || null})
      ON CONFLICT (guild_id)
      DO UPDATE SET
        channel_id = EXCLUDED.channel_id,
        log_channel_id = EXCLUDED.log_channel_id,
        updated_at = NOW()
    `;
  }

  return {
    success: true,
    data: {
      suggestion: {
        submission_channel_id: sugChannel || null,
      },
      confession: {
        submission_channel_id: confChannel || null,
        log_channel_id: confLog || null,
      },
    },
  };
}

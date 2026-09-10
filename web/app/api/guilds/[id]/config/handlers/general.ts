import { db } from '@/lib/db';
import { cleanSnowflake, cleanString, HandlerResult } from '../helpers';

export async function handleGeneral(guildId: string, data: any): Promise<HandlerResult> {
  const prefix = cleanString(data.prefix, 5) || '!';
  const log_channel_id = cleanSnowflake(data.log_channel_id);
  const audit_channel_id = cleanSnowflake(data.audit_channel_id);
  const bot_commander_role_id = cleanSnowflake(data.bot_commander_role_id);

  await db.begin(async (tx) => {
    await tx`
      INSERT INTO guild_config (guild_id, prefix, log_channel_id)
      VALUES (${guildId}, ${prefix || '!'}, ${log_channel_id || null})
      ON CONFLICT (guild_id)
      DO UPDATE SET
        prefix = EXCLUDED.prefix,
        log_channel_id = EXCLUDED.log_channel_id,
        updated_at = NOW()
    `;

    await tx`
      INSERT INTO economy_config (guild_id, audit_channel_id, bot_commander_role_id)
      VALUES (${guildId}, ${audit_channel_id || null}, ${bot_commander_role_id || null})
      ON CONFLICT (guild_id)
      DO UPDATE SET
        audit_channel_id = EXCLUDED.audit_channel_id,
        bot_commander_role_id = EXCLUDED.bot_commander_role_id,
        updated_at = NOW()
    `;
  });

  return {
    success: true,
    data: {
      prefix,
      log_channel_id,
      audit_channel_id,
      bot_commander_role_id,
    },
  };
}

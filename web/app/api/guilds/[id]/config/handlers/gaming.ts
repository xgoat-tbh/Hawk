import { db } from '@/lib/db';
import { cleanSnowflake, cleanString, cleanInt, HandlerResult } from '../helpers';

export async function handleGaming(guildId: string, module: string, data: any): Promise<HandlerResult> {
  if (module === 'gaming_add_ping') {
    const identifier = cleanString(data.identifier, 32).toLowerCase();
    const game_name = cleanString(data.game_name, 64);
    const role_id = cleanSnowflake(data.role_id);
    const vc_id = cleanSnowflake(data.vc_id);
    const cooldown_seconds = cleanInt(data.cooldown_seconds, 10, 86400, 1200);

    if (!identifier || !game_name || !role_id || !vc_id) {
      return { success: false, error: 'All trigger fields are required.', status: 400 };
    }

    await db`
      INSERT INTO game_pings (guild_id, identifier, game_name, role_id, vc_id, cooldown_seconds)
      VALUES (${guildId}, ${identifier}, ${game_name}, ${role_id}, ${vc_id}, ${cooldown_seconds})
      ON CONFLICT (guild_id, identifier)
      DO UPDATE SET
        game_name = EXCLUDED.game_name,
        role_id = EXCLUDED.role_id,
        vc_id = EXCLUDED.vc_id,
        cooldown_seconds = EXCLUDED.cooldown_seconds,
        updated_at = NOW()
    `;

    return { success: true, data: { identifier, game_name, role_id, vc_id, cooldown_seconds } };
  }

  if (module === 'gaming_delete_ping') {
    const identifier = cleanString(data.identifier, 32).toLowerCase();
    await db`DELETE FROM game_pings WHERE guild_id = ${guildId} AND identifier = ${identifier}`;
    return { success: true, data: { identifier, deleted: true } };
  }

  if (module === 'gaming_set_test_channel') {
    const channel_id = cleanSnowflake(data.channel_id);
    if (channel_id) {
      await db`
        INSERT INTO game_guild_configs (guild_id, test_channel_id)
        VALUES (${guildId}, ${channel_id})
        ON CONFLICT (guild_id)
        DO UPDATE SET test_channel_id = EXCLUDED.test_channel_id, updated_at = NOW()
      `;
    } else {
      await db`DELETE FROM game_guild_configs WHERE guild_id = ${guildId}`;
    }
    return { success: true, data: { test_channel_id: channel_id } };
  }

  return { success: false, error: `Unsupported gaming action: ${module}`, status: 400 };
}

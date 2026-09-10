import { db } from '@/lib/db';
import { sendChannelMessage, deleteChannelMessage } from '@/lib/discord';
import { cleanSnowflake, cleanString, HandlerResult } from '../helpers';

export async function handleSticky(guildId: string, module: string, data: any): Promise<HandlerResult> {
  if (module === 'sticky_add' || module === 'sticky_set' || module === 'sticky_update') {
    const channel_id = cleanSnowflake(data.channel_id);
    const content = cleanString(data.content || data.message, 4000);
    if (!channel_id || !content) {
      return { success: false, error: 'Channel and notice content are required.', status: 400 };
    }

    let oldMessageId = '0';
    try {
      const existing = await db`
        SELECT message_id FROM sticky_messages WHERE guild_id = ${guildId} AND channel_id = ${channel_id}
      `;
      if (existing[0]?.message_id) {
        oldMessageId = existing[0].message_id;
      }
    } catch {
      // Fallback
    }

    if (oldMessageId && oldMessageId !== '0') {
      await deleteChannelMessage(channel_id, oldMessageId);
    }

    let postedMessageId = '0';
    try {
      const newMsgId = await sendChannelMessage(channel_id, content);
      if (newMsgId) postedMessageId = newMsgId;
    } catch (err) {
      console.warn('Discord sticky push warning:', err);
    }

    await db`
      INSERT INTO sticky_messages (guild_id, channel_id, message_id, content)
      VALUES (${guildId}, ${channel_id}, ${postedMessageId}, ${content})
      ON CONFLICT (guild_id, channel_id)
      DO UPDATE SET
        message_id = ${postedMessageId},
        content = EXCLUDED.content,
        updated_at = NOW()
    `;

    return { success: true, data: { channel_id, content, message_id: postedMessageId } };
  }

  if (module === 'sticky_delete') {
    const channel_id = cleanSnowflake(data.channel_id);
    if (channel_id) {
      try {
        const existing = await db`
          SELECT message_id FROM sticky_messages WHERE guild_id = ${guildId} AND channel_id = ${channel_id}
        `;
        if (existing[0]?.message_id && existing[0].message_id !== '0') {
          await deleteChannelMessage(channel_id, existing[0].message_id);
        }
      } catch {
        // Fallback
      }

      await db`DELETE FROM sticky_messages WHERE guild_id = ${guildId} AND channel_id = ${channel_id}`;
    }
    return { success: true, data: { channel_id, deleted: true } };
  }

  return { success: false, error: `Unsupported sticky action: ${module}`, status: 400 };
}

import { db } from '@/lib/db';
import { cleanSnowflake, cleanString, HandlerResult } from '../helpers';

export async function handleWelcome(guildId: string, data: any): Promise<HandlerResult> {
  const { config = {}, embed = {} } = data;
  const is_embed = data.is_embed !== undefined ? Boolean(data.is_embed) : true;

  let embedColorInt = 0x2b2d31;
  let colorHex = '#ffffff';
  if (embed.color && typeof embed.color === 'string') {
    colorHex = embed.color.startsWith('#') ? embed.color : `#${embed.color}`;
    const hex = colorHex.replace('#', '');
    const parsed = parseInt(hex, 16);
    if (!isNaN(parsed)) embedColorInt = parsed;
  }

  const title = cleanString(embed.title, 256) || 'Welcome to {server}!';
  const description = cleanString(embed.description, 4096) || 'Hey {user}, welcome! Check out the rules.';
  const footer_text = cleanString(embed.footer_text, 2048) || null;
  const image_url = embed.image_url && typeof embed.image_url === 'string' && embed.image_url.startsWith('http') ? embed.image_url.trim() : null;
  const thumbnail_url = embed.thumbnail_url && typeof embed.thumbnail_url === 'string' ? embed.thumbnail_url.trim() : null;

  const greetPayloadObj = is_embed
    ? {
        embeds: [
          {
            title,
            description,
            color: embedColorInt,
            image: image_url ? { url: image_url } : undefined,
            thumbnail: thumbnail_url ? { url: thumbnail_url } : undefined,
            footer: footer_text ? { text: footer_text } : undefined,
          },
        ],
      }
    : {
        content: description,
        embeds: [],
      };

  const channelId = cleanSnowflake(config.channel_id);
  const enabled = Boolean(config.enabled);
  const greetPayloadObjWithMeta = {
    ...greetPayloadObj,
    content: description,
    channel_id: channelId,
    enabled,
    is_embed,
  };
  const payloadStr = JSON.stringify(greetPayloadObjWithMeta);

  await db`
    INSERT INTO welcome_configs (guild_id, greet_channel_id, greet_payload, greet_enabled)
    VALUES (${guildId}, ${channelId}, ${payloadStr}, ${enabled})
    ON CONFLICT (guild_id)
    DO UPDATE SET
      greet_channel_id = EXCLUDED.greet_channel_id,
      greet_payload = EXCLUDED.greet_payload,
      greet_enabled = EXCLUDED.greet_enabled,
      updated_at = NOW()
  `;

  return {
    success: true,
    data: {
      is_embed: Boolean(data.is_embed),
      plain_content: description,
      config: {
        enabled: enabled && Boolean(channelId),
        channel_id: channelId,
      },
      embed: {
        title,
        description,
        color: colorHex,
        image_url,
        thumbnail_url,
        footer_text,
      },
    },
  };
}

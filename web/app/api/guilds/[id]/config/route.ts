import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db, ensureDatabaseSchema } from '@/lib/db';
import { sendChannelMessage, deleteChannelMessage } from '@/lib/discord';

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

function cleanSnowflake(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const clean = id.trim();
  return SNOWFLAKE_REGEX.test(clean) ? clean : null;
}

function cleanString(str: unknown, maxLen = 2000): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function cleanInt(val: unknown, min = 0, max = 1_000_000_000, fallback = 0): number {
  const parsed = Number(val);
  if (isNaN(parsed) || !isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;

  // Server-side authorization check
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden: You are not authorized to configure this server.' },
      { status: 403 }
    );
  }

  await ensureDatabaseSchema();

  try {
    const body = await req.json();
    const { module, data } = body;
    if (!module || !data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    let canonicalData: any = null;

    switch (module) {
      case 'general': {
        const prefix = cleanString(data.prefix, 5) || '!';
        const log_channel_id = cleanSnowflake(data.log_channel_id);
        const audit_channel_id = cleanSnowflake(data.audit_channel_id);
        const bot_commander_role_id = cleanSnowflake(data.bot_commander_role_id);

        await db`
          INSERT INTO guild_config (guild_id, prefix, log_channel_id)
          VALUES (${guildId}, ${prefix || '!'}, ${log_channel_id || null})
          ON CONFLICT (guild_id)
          DO UPDATE SET
            prefix = EXCLUDED.prefix,
            log_channel_id = EXCLUDED.log_channel_id,
            updated_at = NOW()
        `;

        await db`
          INSERT INTO economy_config (guild_id, audit_channel_id, bot_commander_role_id)
          VALUES (${guildId}, ${audit_channel_id || null}, ${bot_commander_role_id || null})
          ON CONFLICT (guild_id)
          DO UPDATE SET
            audit_channel_id = EXCLUDED.audit_channel_id,
            bot_commander_role_id = EXCLUDED.bot_commander_role_id,
            updated_at = NOW()
        `;

        canonicalData = {
          prefix,
          log_channel_id,
          audit_channel_id,
          bot_commander_role_id,
        };
        break;
      }

      case 'economy': {
        const currency_symbol = cleanString(data.currency_symbol, 5) || '$';
        const start_balance = cleanInt(data.start_balance, 0, 1_000_000_000, 0);
        const daily_reward_amount = cleanInt(data.daily_reward_amount, 0, 1_000_000_000, 1000);
        const daily_streak_bonus = cleanInt(data.daily_streak_bonus, 0, 1_000_000_000, 100);
        const passive_income = Boolean(data.passive_income);
        const passive_amount = cleanInt(data.passive_amount, 1, 1_000_000, 10);

        await db`
          INSERT INTO economy_config (
            guild_id,
            currency_symbol,
            start_balance,
            daily_reward_amount,
            daily_streak_bonus,
            passive_income,
            passive_amount
          )
          VALUES (
            ${guildId},
            ${currency_symbol},
            ${start_balance},
            ${daily_reward_amount},
            ${daily_streak_bonus},
            ${passive_income},
            ${passive_amount}
          )
          ON CONFLICT (guild_id)
          DO UPDATE SET
            currency_symbol = EXCLUDED.currency_symbol,
            start_balance = EXCLUDED.start_balance,
            daily_reward_amount = EXCLUDED.daily_reward_amount,
            daily_streak_bonus = EXCLUDED.daily_streak_bonus,
            passive_income = EXCLUDED.passive_income,
            passive_amount = EXCLUDED.passive_amount,
            updated_at = NOW()
        `;

        canonicalData = {
          currency_symbol,
          start_balance,
          daily_reward_amount,
          daily_streak_bonus,
          passive_income,
          passive_amount,
        };
        break;
      }

      case 'pvc': {
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

        canonicalData = {
          pvc_hourly_rate,
          pvc_jtc_channel_id,
          pvc_category_id,
          pvc_command_channel_id,
          pvc_panel_channel_id,
        };
        break;
      }

      case 'welcome': {
        const { config = {}, embed = {} } = data;

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

        const greetPayloadObj = {
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
        };

        const channelId = cleanSnowflake(config.channel_id);
        const enabled = Boolean(config.enabled);
        const greetPayloadObjWithMeta = {
          ...greetPayloadObj,
          channel_id: channelId,
          enabled,
          is_embed: Boolean(data.is_embed),
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

        canonicalData = {
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
        };
        break;
      }

      case 'community': {
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

        canonicalData = {
          suggestion: {
            submission_channel_id: sugChannel || null,
          },
          confession: {
            submission_channel_id: confChannel || null,
            log_channel_id: confLog || null,
          },
        };
        break;
      }

      // Store items
      case 'add_store_item': {
        const name = cleanString(data.name, 100);
        const price = cleanInt(data.price, 1, 1_000_000_000, 100);
        const description = cleanString(data.description, 255) || null;
        const inventory_role_id = cleanSnowflake(data.inventory_role_id);

        if (!name) {
          return NextResponse.json({ error: 'Item name is required.' }, { status: 400 });
        }

        const [last] = await db`SELECT COALESCE(MAX(item_id), 0) + 1 AS next_id FROM store_items WHERE guild_id = ${guildId}`;
        const nextId = last.next_id;

        await db`
          INSERT INTO store_items (guild_id, item_id, name, price, description, inventory_role_id)
          VALUES (${guildId}, ${nextId}, ${name}, ${price}, ${description}, ${inventory_role_id})
        `;

        canonicalData = { item_id: nextId, name, price, description, inventory_role_id };
        break;
      }

      case 'delete_store_item': {
        const item_id = cleanInt(data.item_id);
        await db`DELETE FROM store_items WHERE guild_id = ${guildId} AND item_id = ${item_id}`;
        canonicalData = { item_id, deleted: true };
        break;
      }

      // Gaming LFG Triggers
      case 'gaming_add_ping': {
        const identifier = cleanString(data.identifier, 32).toLowerCase();
        const game_name = cleanString(data.game_name, 64);
        const role_id = cleanSnowflake(data.role_id);
        const vc_id = cleanSnowflake(data.vc_id);
        const cooldown_seconds = cleanInt(data.cooldown_seconds, 10, 86400, 1200);

        if (!identifier || !game_name || !role_id || !vc_id) {
          return NextResponse.json({ error: 'All trigger fields are required.' }, { status: 400 });
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

        canonicalData = { identifier, game_name, role_id, vc_id, cooldown_seconds };
        break;
      }

      case 'gaming_delete_ping': {
        const identifier = cleanString(data.identifier, 32).toLowerCase();
        await db`DELETE FROM game_pings WHERE guild_id = ${guildId} AND identifier = ${identifier}`;
        canonicalData = { identifier, deleted: true };
        break;
      }

      case 'gaming_set_test_channel': {
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
        canonicalData = { test_channel_id: channel_id };
        break;
      }

      // Income Roles
      case 'income_add_role': {
        const role_id = cleanSnowflake(data.role_id);
        const income_amount = cleanInt(data.income_amount, 1, 1_000_000_000, 100);
        if (!role_id) {
          return NextResponse.json({ error: 'Role is required.' }, { status: 400 });
        }

        await db`
          INSERT INTO income_roles (guild_id, role_id, income_amount)
          VALUES (${guildId}, ${role_id}, ${income_amount})
          ON CONFLICT (guild_id, role_id)
          DO UPDATE SET income_amount = EXCLUDED.income_amount
        `;

        canonicalData = { role_id, income_amount };
        break;
      }

      case 'income_delete_role': {
        const role_id = cleanSnowflake(data.role_id);
        if (role_id) {
          await db`DELETE FROM income_roles WHERE guild_id = ${guildId} AND role_id = ${role_id}`;
        }
        canonicalData = { role_id, deleted: true };
        break;
      }

      // Sticky Messages (Create, Update & Push to Discord)
      case 'sticky_add':
      case 'sticky_set':
      case 'sticky_update': {
        const channel_id = cleanSnowflake(data.channel_id);
        const content = cleanString(data.content || data.message, 4000);
        if (!channel_id || !content) {
          return NextResponse.json({ error: 'Channel and notice content are required.' }, { status: 400 });
        }

        // Check if previous sticky message exists to delete old Discord message
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

        // Delete previous Discord message if it was posted
        if (oldMessageId && oldMessageId !== '0') {
          await deleteChannelMessage(channel_id, oldMessageId);
        }

        // Proactively push the updated sticky message directly to Discord channel
        let postedMessageId = '0';
        try {
          const newMsgId = await sendChannelMessage(channel_id, content);
          if (newMsgId) postedMessageId = newMsgId;
        } catch (err) {
          console.warn('Discord sticky push warning:', err);
        }

        // Upsert into PostgreSQL sticky_messages
        await db`
          INSERT INTO sticky_messages (guild_id, channel_id, message_id, content)
          VALUES (${guildId}, ${channel_id}, ${postedMessageId}, ${content})
          ON CONFLICT (guild_id, channel_id)
          DO UPDATE SET
            message_id = ${postedMessageId},
            content = EXCLUDED.content,
            updated_at = NOW()
        `;

        canonicalData = { channel_id, content, message_id: postedMessageId };
        break;
      }

      case 'sticky_delete': {
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
        canonicalData = { channel_id, deleted: true };
        break;
      }

      // Media Channels
      case 'media_add': {
        const channel_id = cleanSnowflake(data.channel_id);
        if (channel_id) {
          await db`
            INSERT INTO media_channels (guild_id, channel_id)
            VALUES (${guildId}, ${channel_id})
            ON CONFLICT (guild_id, channel_id) DO NOTHING
          `;
        }
        canonicalData = { channel_id };
        break;
      }

      case 'media_delete': {
        const channel_id = cleanSnowflake(data.channel_id);
        if (channel_id) {
          await db`DELETE FROM media_channels WHERE guild_id = ${guildId} AND channel_id = ${channel_id}`;
        }
        canonicalData = { channel_id, deleted: true };
        break;
      }

      case 'media_set_autothread': {
        const auto_thread = Boolean(data.auto_thread);
        await db`
          INSERT INTO media_guild_configs (guild_id, auto_thread)
          VALUES (${guildId}, ${auto_thread})
          ON CONFLICT (guild_id)
          DO UPDATE SET auto_thread = EXCLUDED.auto_thread, updated_at = NOW()
        `;
        canonicalData = { auto_thread };
        break;
      }

      // Custom Permits
      case 'permit_add': {
        const target_type = data.target_type === 'role' ? 'role' : 'user';
        const target_id = cleanSnowflake(data.target_id);
        const command_name = cleanString(data.command_name, 32).toLowerCase() || null;
        const module_name = cleanString(data.module_name, 32).toLowerCase() || null;

        if (!target_id) {
          return NextResponse.json({ error: 'Target ID is required.' }, { status: 400 });
        }

        await db`
          INSERT INTO permits (guild_id, target_type, target_id, command_name, module_name)
          VALUES (${guildId}, ${target_type}, ${target_id}, ${command_name}, ${module_name})
          ON CONFLICT (guild_id, target_type, target_id, command_name, module_name) DO NOTHING
        `;
        canonicalData = { target_type, target_id, command_name, module_name };
        break;
      }

      case 'permit_delete': {
        const id = cleanInt(data.id);
        if (id) {
          await db`DELETE FROM permits WHERE guild_id = ${guildId} AND id = ${id}`;
        }
        canonicalData = { id, deleted: true };
        break;
      }

      // Restrictions
      case 'restrict_add': {
        const { target_type, target_id, location_type, location_id, effect } = data;
        const command_name = cleanString(data.command_name, 32).toLowerCase() || null;
        const module_name = cleanString(data.module_name, 32).toLowerCase();
        const cleanTargetId = cleanSnowflake(target_id);
        const cleanLocId = cleanSnowflake(location_id);
        const cleanEffect = effect === 'deny' ? 'deny' : 'allow';
        const cleanLocType = location_type === 'category' ? 'category' : 'channel';

        if (!cleanLocId) {
          return NextResponse.json({ error: 'Location ID is required.' }, { status: 400 });
        }

        await db`
          INSERT INTO restrictions (guild_id, command_name, module_name, target_type, target_id, location_type, location_id, effect)
          VALUES (
            ${guildId},
            ${command_name},
            ${module_name || 'general'},
            ${target_type === 'user' ? 'user' : target_type === 'role' ? 'role' : null},
            ${cleanTargetId},
            ${cleanLocType},
            ${cleanLocId},
            ${cleanEffect}
          )
          ON CONFLICT (guild_id, command_name, module_name, target_type, target_id, location_type, location_id) DO NOTHING
        `;
        canonicalData = {
          command_name,
          module_name,
          target_type,
          target_id: cleanTargetId,
          location_type: cleanLocType,
          location_id: cleanLocId,
          effect: cleanEffect,
        };
        break;
      }

      case 'restrict_delete': {
        const id = cleanInt(data.id);
        if (id) {
          await db`DELETE FROM restrictions WHERE guild_id = ${guildId} AND id = ${id}`;
        }
        canonicalData = { id, deleted: true };
        break;
      }

      // Ignored Entities
      case 'ignore_add': {
        const { entity_type, entity_id, scope_type, scope_id } = data;
        const cleanEntityId = cleanSnowflake(entity_id);
        const cleanEntityType = ['user', 'role', 'channel', 'category'].includes(entity_type) ? entity_type : 'channel';

        if (!cleanEntityId) {
          return NextResponse.json({ error: 'Entity ID is required.' }, { status: 400 });
        }

        await db`
          INSERT INTO ignored_entities (guild_id, entity_type, entity_id, scope_type, scope_id)
          VALUES (${guildId}, ${cleanEntityType}, ${cleanEntityId}, ${scope_type || null}, ${scope_id || null})
          ON CONFLICT (guild_id, entity_type, entity_id, scope_type, scope_id) DO NOTHING
        `;
        canonicalData = { entity_type: cleanEntityType, entity_id: cleanEntityId, scope_type, scope_id };
        break;
      }

      case 'ignore_delete': {
        const id = cleanInt(data.id);
        if (id) {
          await db`DELETE FROM ignored_entities WHERE guild_id = ${guildId} AND id = ${id}`;
        }
        canonicalData = { id, deleted: true };
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: canonicalData,
      updatedAt: new Date().toISOString(),
      message: 'Configuration saved successfully.',
    });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json({ error: 'Failed to save configuration.' }, { status: 500 });
  }
}
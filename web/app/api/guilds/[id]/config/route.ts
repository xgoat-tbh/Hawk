import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;

  try {
    const body = await req.json();
    const { module, data } = body;

    switch (module) {
      case 'general': {
        const { prefix, log_channel_id, audit_channel_id, bot_commander_role_id } = data;

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
        break;
      }

      case 'economy': {
        const {
          currency_symbol,
          start_balance,
          daily_reward_amount,
          daily_streak_bonus,
          passive_income,
          passive_amount,
        } = data;
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
            ${currency_symbol || '$'},
            ${Number(start_balance) || 0},
            ${Number(daily_reward_amount) || 1000},
            ${Number(daily_streak_bonus) || 100},
            ${Boolean(passive_income)},
            ${Number(passive_amount) || 10}
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
        break;
      }

      case 'pvc': {
        const { pvc_hourly_rate, pvc_jtc_channel_id, pvc_category_id, pvc_command_channel_id, pvc_panel_channel_id } = data;
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
            ${Number(pvc_hourly_rate) || 100},
            ${pvc_jtc_channel_id || null},
            ${pvc_category_id || null},
            ${pvc_command_channel_id || null},
            ${pvc_panel_channel_id || null}
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
        break;
      }

      case 'welcome': {
        const { config, embed } = data;

        let embedColorInt = 5793266;
        if (embed.color) {
          const hex = embed.color.replace('#', '');
          const parsed = parseInt(hex, 16);
          if (!isNaN(parsed)) embedColorInt = parsed;
        }

        const greetPayloadObj = {
          embeds: [
            {
              title: embed.title || 'Welcome to {server}!',
              description: embed.description || 'Hey {user}, welcome! Check out the rules.',
              color: embedColorInt,
              image: embed.image_url ? { url: embed.image_url } : undefined,
              thumbnail: embed.thumbnail_url ? { url: embed.thumbnail_url } : undefined,
              footer: embed.footer_text ? { text: embed.footer_text } : undefined,
            },
          ],
        };

        const channelId = config.enabled ? config.channel_id : null;
        const payloadStr = JSON.stringify(greetPayloadObj);

        await db`
          INSERT INTO welcome_configs (guild_id, greet_channel_id, greet_payload)
          VALUES (${guildId}, ${channelId}, ${payloadStr})
          ON CONFLICT (guild_id)
          DO UPDATE SET
            greet_channel_id = EXCLUDED.greet_channel_id,
            greet_payload = EXCLUDED.greet_payload,
            updated_at = NOW()
        `;
        break;
      }

      case 'community': {
        const { suggestion, confession } = data;
        if (suggestion?.submission_channel_id) {
          await db`
            INSERT INTO suggestion_configs (guild_id, channel_id)
            VALUES (${guildId}, ${suggestion.submission_channel_id})
            ON CONFLICT (guild_id)
            DO UPDATE SET
              channel_id = EXCLUDED.channel_id,
              updated_at = NOW()
          `;
        }

        if (confession?.submission_channel_id) {
          await db`
            INSERT INTO confession_configs (guild_id, channel_id, log_channel_id)
            VALUES (${guildId}, ${confession.submission_channel_id}, ${confession.log_channel_id || null})
            ON CONFLICT (guild_id)
            DO UPDATE SET
              channel_id = EXCLUDED.channel_id,
              log_channel_id = EXCLUDED.log_channel_id,
              updated_at = NOW()
          `;
        }
        break;
      }

      // Store items
      case 'add_store_item': {
        const { name, price, description, inventory_role_id } = data;
        const [last] = await db`SELECT COALESCE(MAX(item_id), 0) + 1 AS next_id FROM store_items WHERE guild_id = ${guildId}`;
        const nextId = last.next_id;

        await db`
          INSERT INTO store_items (guild_id, item_id, name, price, description, inventory_role_id)
          VALUES (${guildId}, ${nextId}, ${name}, ${Number(price)}, ${description || null}, ${inventory_role_id || null})
        `;
        break;
      }

      case 'delete_store_item': {
        const { item_id } = data;
        await db`DELETE FROM store_items WHERE guild_id = ${guildId} AND item_id = ${Number(item_id)}`;
        break;
      }

      // Gaming LFG Triggers
      case 'gaming_add_ping': {
        const { identifier, game_name, role_id, vc_id, cooldown_seconds } = data;
        const lowerId = String(identifier).trim().toLowerCase();
        await db`
          INSERT INTO game_pings (guild_id, identifier, game_name, role_id, vc_id, cooldown_seconds)
          VALUES (${guildId}, ${lowerId}, ${game_name}, ${role_id}, ${vc_id}, ${Number(cooldown_seconds) || 1200})
          ON CONFLICT (guild_id, identifier)
          DO UPDATE SET
            game_name = EXCLUDED.game_name,
            role_id = EXCLUDED.role_id,
            vc_id = EXCLUDED.vc_id,
            cooldown_seconds = EXCLUDED.cooldown_seconds,
            updated_at = NOW()
        `;
        break;
      }

      case 'gaming_delete_ping': {
        const { identifier } = data;
        const lowerId = String(identifier).trim().toLowerCase();
        await db`DELETE FROM game_pings WHERE guild_id = ${guildId} AND identifier = ${lowerId}`;
        break;
      }

      case 'gaming_set_test_channel': {
        const { channel_id } = data;
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
        break;
      }

      // Income Roles
      case 'income_add_role': {
        const { role_id, income_amount } = data;
        await db`
          INSERT INTO income_roles (guild_id, role_id, income_amount)
          VALUES (${guildId}, ${role_id}, ${Number(income_amount) || 0})
          ON CONFLICT (guild_id, role_id)
          DO UPDATE SET income_amount = EXCLUDED.income_amount
        `;
        break;
      }

      case 'income_delete_role': {
        const { role_id } = data;
        await db`DELETE FROM income_roles WHERE guild_id = ${guildId} AND role_id = ${role_id}`;
        break;
      }

      // Sticky Messages
      case 'sticky_add': {
        const { channel_id, content } = data;
        await db`
          INSERT INTO sticky_messages (guild_id, channel_id, message_id, content)
          VALUES (${guildId}, ${channel_id}, '0', ${content})
          ON CONFLICT (guild_id, channel_id)
          DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
        `;
        break;
      }

      case 'sticky_delete': {
        const { channel_id } = data;
        await db`DELETE FROM sticky_messages WHERE guild_id = ${guildId} AND channel_id = ${channel_id}`;
        break;
      }

      // Media Channels
      case 'media_add': {
        const { channel_id } = data;
        await db`
          INSERT INTO media_channels (guild_id, channel_id)
          VALUES (${guildId}, ${channel_id})
          ON CONFLICT (guild_id, channel_id) DO NOTHING
        `;
        break;
      }

      case 'media_delete': {
        const { channel_id } = data;
        await db`DELETE FROM media_channels WHERE guild_id = ${guildId} AND channel_id = ${channel_id}`;
        break;
      }

      case 'media_set_autothread': {
        const { auto_thread } = data;
        await db`
          INSERT INTO media_guild_configs (guild_id, auto_thread)
          VALUES (${guildId}, ${Boolean(auto_thread)})
          ON CONFLICT (guild_id)
          DO UPDATE SET auto_thread = EXCLUDED.auto_thread, updated_at = NOW()
        `;
        break;
      }

      // Custom Permits
      case 'permit_add': {
        const { target_type, target_id, command_name, module_name } = data;
        await db`
          INSERT INTO permits (guild_id, target_type, target_id, command_name, module_name)
          VALUES (${guildId}, ${target_type}, ${target_id}, ${command_name || null}, ${module_name || null})
          ON CONFLICT (guild_id, target_type, target_id, command_name, module_name) DO NOTHING
        `;
        break;
      }

      case 'permit_delete': {
        const { id } = data;
        await db`DELETE FROM permits WHERE guild_id = ${guildId} AND id = ${Number(id)}`;
        break;
      }

      // Restrictions
      case 'restrict_add': {
        const { command_name, module_name, target_type, target_id, location_type, location_id, effect } = data;
        await db`
          INSERT INTO restrictions (guild_id, command_name, module_name, target_type, target_id, location_type, location_id, effect)
          VALUES (
            ${guildId},
            ${command_name || null},
            ${module_name},
            ${target_type || null},
            ${target_id || null},
            ${location_type},
            ${location_id},
            ${effect || 'allow'}
          )
          ON CONFLICT (guild_id, command_name, module_name, target_type, target_id, location_type, location_id) DO NOTHING
        `;
        break;
      }

      case 'restrict_delete': {
        const { id } = data;
        await db`DELETE FROM restrictions WHERE guild_id = ${guildId} AND id = ${Number(id)}`;
        break;
      }

      // Ignored Entities
      case 'ignore_add': {
        const { entity_type, entity_id, scope_type, scope_id } = data;
        await db`
          INSERT INTO ignored_entities (guild_id, entity_type, entity_id, scope_type, scope_id)
          VALUES (${guildId}, ${entity_type}, ${entity_id}, ${scope_type || null}, ${scope_id || null})
          ON CONFLICT (guild_id, entity_type, entity_id, scope_type, scope_id) DO NOTHING
        `;
        break;
      }

      case 'ignore_delete': {
        const { id } = data;
        await db`DELETE FROM ignored_entities WHERE guild_id = ${guildId} AND id = ${Number(id)}`;
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Configuration saved successfully.' });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json({ error: 'Failed to save configuration.' }, { status: 500 });
  }
}
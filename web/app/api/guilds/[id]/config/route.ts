import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchUserGuilds } from '@/lib/discord';
import { db } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const userGuilds = await fetchUserGuilds(session.accessToken);
  const hasAccess = userGuilds.some((g) => g.id === guildId);

  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied: You do not have Manage Server permissions.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { module, data } = body;

    switch (module) {
      case 'general': {
        const { prefix, log_channel_id, audit_channel_id, bot_commander_role_id } = data;
        await db`
          INSERT INTO guild_config (guild_id, prefix, log_channel_id, audit_channel_id, bot_commander_role_id)
          VALUES (${guildId}, ${prefix || '!'}, ${log_channel_id || null}, ${audit_channel_id || null}, ${bot_commander_role_id || null})
          ON CONFLICT (guild_id)
          DO UPDATE SET
            prefix = EXCLUDED.prefix,
            log_channel_id = EXCLUDED.log_channel_id,
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
        await db.begin(async (tx) => {
          await tx`
            INSERT INTO welcome_config (guild_id, channel_id, enabled)
            VALUES (${guildId}, ${config.channel_id || null}, ${Boolean(config.enabled)})
            ON CONFLICT (guild_id)
            DO UPDATE SET
              channel_id = EXCLUDED.channel_id,
              enabled = EXCLUDED.enabled,
              updated_at = NOW()
          `;

          await tx`
            INSERT INTO welcome_embeds (
              guild_id,
              title,
              description,
              color,
              image_url,
              thumbnail_url,
              footer_text
            )
            VALUES (
              ${guildId},
              ${embed.title || null},
              ${embed.description || null},
              ${embed.color || '#5865F2'},
              ${embed.image_url || null},
              ${embed.thumbnail_url || null},
              ${embed.footer_text || null}
            )
            ON CONFLICT (guild_id)
            DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              color = EXCLUDED.color,
              image_url = EXCLUDED.image_url,
              thumbnail_url = EXCLUDED.thumbnail_url,
              footer_text = EXCLUDED.footer_text,
              updated_at = NOW()
          `;
        });
        break;
      }

      case 'community': {
        const { suggestion, confession } = data;
        await db.begin(async (tx) => {
          if (suggestion) {
            await tx`
              INSERT INTO suggestion_config (
                guild_id,
                submission_channel_id,
                review_channel_id,
                approved_channel_id,
                denied_channel_id
              )
              VALUES (
                ${guildId},
                ${suggestion.submission_channel_id || null},
                ${suggestion.review_channel_id || null},
                ${suggestion.approved_channel_id || null},
                ${suggestion.denied_channel_id || null}
              )
              ON CONFLICT (guild_id)
              DO UPDATE SET
                submission_channel_id = EXCLUDED.submission_channel_id,
                review_channel_id = EXCLUDED.review_channel_id,
                approved_channel_id = EXCLUDED.approved_channel_id,
                denied_channel_id = EXCLUDED.denied_channel_id,
                updated_at = NOW()
            `;
          }

          if (confession) {
            await tx`
              INSERT INTO confession_config (
                guild_id,
                submission_channel_id,
                log_channel_id
              )
              VALUES (
                ${guildId},
                ${confession.submission_channel_id || null},
                ${confession.log_channel_id || null}
              )
              ON CONFLICT (guild_id)
              DO UPDATE SET
                submission_channel_id = EXCLUDED.submission_channel_id,
                log_channel_id = EXCLUDED.log_channel_id,
                updated_at = NOW()
            `;
          }
        });
        break;
      }

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

      default:
        return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Configuration saved successfully.' });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json({ error: 'Failed to save configuration.' }, { status: 500 });
  }
}

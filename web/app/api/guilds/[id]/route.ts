import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchBotGuilds, fetchGuildChannels, fetchGuildRoles } from '@/lib/discord';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;

  // 1. Fetch live Discord channels and roles with in-memory cached rate-limit protection
  const [botGuilds, channels, roles] = await Promise.all([
    fetchBotGuilds(),
    fetchGuildChannels(guildId),
    fetchGuildRoles(guildId),
  ]);

  const targetGuild = botGuilds.find((g) => g.id === guildId);

  // 2. Fetch all module configs from PostgreSQL with resilient error handling
  let guildConfig: any = { prefix: '!', log_channel_id: null };
  let economyConfig: any = {
    currency_symbol: '$',
    bot_commander_role_id: null,
    start_balance: 0,
    daily_reward_amount: 1000,
    daily_streak_bonus: 100,
    passive_income: false,
    passive_amount: 10,
    audit_channel_id: null,
    pvc_hourly_rate: 100,
    pvc_jtc_channel_id: null,
    pvc_category_id: null,
    pvc_command_channel_id: null,
    pvc_panel_channel_id: null,
  };
  const welcomeConfig: any = { channel_id: null, enabled: false };
  let welcomeEmbed: any = {
    title: 'Welcome to {server}!',
    description: 'Hey {user}, welcome to the server! Make sure to read the rules and enjoy your stay.',
    color: '#5865F2',
    image_url: null,
    thumbnail_url: '{user.avatar}',
    footer_text: 'Member #{server.count}',
  };
  const suggestionConfig: any = { submission_channel_id: null };
  const confessionConfig: any = { submission_channel_id: null, log_channel_id: null };
  let storeItems: any[] = [];
  let gamePings: any[] = [];
  let gameTestChannel: string | null = null;
  let incomeRoles: any[] = [];
  let stickyMessages: any[] = [];
  let mediaChannels: any[] = [];
  let mediaAutoThread = true;
  let permits: any[] = [];
  let restrictions: any[] = [];
  let ignoredEntities: any[] = [];

  try {
    const rows = await db`SELECT * FROM guild_config WHERE guild_id = ${guildId}`;
    if (rows[0]) guildConfig = { ...guildConfig, ...rows[0] };
  } catch (err) {
    console.warn('guild_config query error:', err);
  }

  try {
    const rows = await db`SELECT * FROM economy_config WHERE guild_id = ${guildId}`;
    if (rows[0]) economyConfig = { ...economyConfig, ...rows[0] };
  } catch (err) {
    console.warn('economy_config query error:', err);
  }

  try {
    const rows = await db`SELECT * FROM welcome_configs WHERE guild_id = ${guildId}`;
    if (rows[0]) {
      const row = rows[0];
      welcomeConfig.channel_id = row.greet_channel_id || null;
      welcomeConfig.enabled = Boolean(row.greet_channel_id);

      if (row.greet_payload) {
        try {
          const parsed = JSON.parse(row.greet_payload);
          const emb = Array.isArray(parsed.embeds) ? parsed.embeds[0] : parsed.embed;
          if (emb) {
            welcomeEmbed = {
              title: emb.title || 'Welcome to {server}!',
              description: emb.description || parsed.content || '',
              color: emb.color ? (typeof emb.color === 'number' ? '#' + emb.color.toString(16).padStart(6, '0') : emb.color) : '#5865F2',
              image_url: emb.image?.url || null,
              thumbnail_url: emb.thumbnail?.url || '{user.avatar}',
              footer_text: emb.footer?.text || null,
            };
          } else if (parsed.content) {
            welcomeEmbed.description = parsed.content;
          }
        } catch {
          welcomeEmbed.description = row.greet_payload;
        }
      }
    }
  } catch (err) {
    console.warn('welcome_configs query error:', err);
  }

  try {
    const rows = await db`SELECT * FROM suggestion_configs WHERE guild_id = ${guildId}`;
    if (rows[0]) suggestionConfig.submission_channel_id = rows[0].channel_id || null;
  } catch (err) {
    console.warn('suggestion_configs query error:', err);
  }

  try {
    const rows = await db`SELECT * FROM confession_configs WHERE guild_id = ${guildId}`;
    if (rows[0]) {
      confessionConfig.submission_channel_id = rows[0].channel_id || null;
      confessionConfig.log_channel_id = rows[0].log_channel_id || null;
    }
  } catch (err) {
    console.warn('confession_configs query error:', err);
  }

  try {
    storeItems = await db`SELECT * FROM store_items WHERE guild_id = ${guildId} ORDER BY item_id ASC`;
  } catch (err) {
    console.warn('store_items query error:', err);
  }

  // Gaming Pings & Test Channel
  try {
    gamePings = await db`SELECT * FROM game_pings WHERE guild_id = ${guildId} ORDER BY identifier ASC`;
    const testRow = await db`SELECT test_channel_id FROM game_guild_configs WHERE guild_id = ${guildId}`;
    if (testRow[0]) gameTestChannel = testRow[0].test_channel_id || null;
  } catch (err) {
    console.warn('game_pings query error:', err);
  }

  // Income Roles
  try {
    incomeRoles = await db`SELECT * FROM income_roles WHERE guild_id = ${guildId} ORDER BY income_amount DESC`;
  } catch (err) {
    console.warn('income_roles query error:', err);
  }

  // Sticky Messages
  try {
    stickyMessages = await db`SELECT * FROM sticky_messages WHERE guild_id = ${guildId} ORDER BY id ASC`;
  } catch (err) {
    console.warn('sticky_messages query error:', err);
  }

  // Media Channels
  try {
    mediaChannels = await db`SELECT * FROM media_channels WHERE guild_id = ${guildId} ORDER BY id ASC`;
    const mediaConf = await db`SELECT auto_thread FROM media_guild_configs WHERE guild_id = ${guildId}`;
    if (mediaConf[0]) mediaAutoThread = Boolean(mediaConf[0].auto_thread);
  } catch (err) {
    console.warn('media_channels query error:', err);
  }

  // Permissions & Restrictions
  try {
    permits = await db`SELECT * FROM permits WHERE guild_id = ${guildId} ORDER BY id ASC`;
    restrictions = await db`SELECT * FROM restrictions WHERE guild_id = ${guildId} ORDER BY id ASC`;
    ignoredEntities = await db`SELECT * FROM ignored_entities WHERE guild_id = ${guildId} ORDER BY id ASC`;
  } catch (err) {
    console.warn('permissions queries error:', err);
  }

  const mergedGeneral = {
    prefix: guildConfig.prefix || '!',
    log_channel_id: guildConfig.log_channel_id || null,
    audit_channel_id: economyConfig.audit_channel_id || null,
    bot_commander_role_id: economyConfig.bot_commander_role_id || null,
  };

  return NextResponse.json({
    guild: targetGuild
      ? {
          ...targetGuild,
          iconUrl: targetGuild.icon
            ? `https://cdn.discordapp.com/icons/${targetGuild.id}/${targetGuild.icon}.png?size=128`
            : null,
        }
      : { id: guildId, name: 'Discord Server', iconUrl: null },
    channels,
    roles: roles.filter((r) => r.name !== '@everyone'),
    config: {
      general: mergedGeneral,
      economy: economyConfig,
      welcome: { config: welcomeConfig, embed: welcomeEmbed },
      suggestion: suggestionConfig,
      confession: confessionConfig,
      storeItems,
      gamePings,
      gameTestChannel,
      incomeRoles,
      stickyMessages,
      mediaChannels,
      mediaAutoThread,
      permits,
      restrictions,
      ignoredEntities,
    },
  });
}
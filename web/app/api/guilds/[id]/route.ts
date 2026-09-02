import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchUserGuilds, fetchGuildChannels, fetchGuildRoles } from '@/lib/discord';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;

  // Validate user has Manage Guild or Admin on this guild
  const userGuilds = await fetchUserGuilds(session.accessToken);
  const targetGuild = userGuilds.find((g) => g.id === guildId);

  if (!targetGuild) {
    return NextResponse.json({ error: 'Access denied: You do not have Manage Server permissions.' }, { status: 403 });
  }

  try {
    // Fetch Discord live channels & roles
    const [channels, roles] = await Promise.all([
      fetchGuildChannels(guildId),
      fetchGuildRoles(guildId),
    ]);

    // Fetch Database configs in parallel
    const [
      guildConfigRows,
      economyConfigRows,
      welcomeConfigRows,
      welcomeEmbedRows,
      suggestionConfigRows,
      confessionConfigRows,
      stickyRows,
      mediaRows,
      storeRows,
      vconfigRows,
    ] = await Promise.all([
      db`SELECT * FROM guild_config WHERE guild_id = ${guildId}`,
      db`SELECT * FROM economy_config WHERE guild_id = ${guildId}`,
      db`SELECT * FROM welcome_config WHERE guild_id = ${guildId}`,
      db`SELECT * FROM welcome_embeds WHERE guild_id = ${guildId}`,
      db`SELECT * FROM suggestion_config WHERE guild_id = ${guildId}`,
      db`SELECT * FROM confession_config WHERE guild_id = ${guildId}`,
      db`SELECT * FROM sticky_messages WHERE guild_id = ${guildId}`,
      db`SELECT * FROM media_channels WHERE guild_id = ${guildId}`,
      db`SELECT * FROM store_items WHERE guild_id = ${guildId} ORDER BY item_id ASC`,
      db`SELECT * FROM vconfig WHERE guild_id = ${guildId}`,
    ]);

    const guildConfig = guildConfigRows[0] || {
      prefix: '!',
      log_channel_id: null,
      audit_channel_id: null,
      bot_commander_role_id: null,
    };

    const economyConfig = economyConfigRows[0] || {
      currency_symbol: '$',
      start_balance: 0,
      daily_reward_amount: 1000,
      daily_streak_bonus: 100,
      passive_income: false,
      passive_amount: 10,
      pvc_hourly_rate: 100,
      pvc_jtc_channel_id: null,
      pvc_category_id: null,
      pvc_command_channel_id: null,
      pvc_panel_channel_id: null,
    };

    const welcomeConfig = welcomeConfigRows[0] || { channel_id: null, enabled: false };
    const welcomeEmbed = welcomeEmbedRows[0] || {
      title: 'Welcome to {server}!',
      description: 'Hey {user}, welcome to the server! Make sure to read the rules and enjoy your stay.',
      color: '#5865F2',
      image_url: null,
      thumbnail_url: '{user.avatar}',
      footer_text: 'Member #{server.count}',
    };

    const suggestionConfig = suggestionConfigRows[0] || {
      submission_channel_id: null,
      review_channel_id: null,
      approved_channel_id: null,
      denied_channel_id: null,
    };

    const confessionConfig = confessionConfigRows[0] || {
      submission_channel_id: null,
      log_channel_id: null,
    };

    return NextResponse.json({
      guild: {
        ...targetGuild,
        iconUrl: targetGuild.icon
          ? `https://cdn.discordapp.com/icons/${targetGuild.id}/${targetGuild.icon}.png?size=128`
          : null,
      },
      channels,
      roles: roles.filter((r) => r.name !== '@everyone'),
      config: {
        general: guildConfig,
        economy: economyConfig,
        welcome: { config: welcomeConfig, embed: welcomeEmbed },
        suggestion: suggestionConfig,
        confession: confessionConfig,
        stickies: stickyRows,
        mediaChannels: mediaRows.map((m: any) => m.channel_id),
        storeItems: storeRows,
        vconfigs: vconfigRows,
      },
    });
  } catch (error) {
    console.error('Failed to load guild data:', error);
    return NextResponse.json({ error: 'Database or Discord API error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { fetchGuildChannels, fetchGuildDetails } from '@/lib/discord';
import '@/lib/env';

function getBotToken(): string {
  return process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || '';
}

// In-memory rate limiting map: guildId:userId -> lastTestTimestamp
const testMessageRateLimits = new Map<string, number>();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;

  // 1. Enforce server-side authorization check
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permissions to dispatch test messages to this server.' },
      { status: 403 }
    );
  }

  // 2. Rate limiting (1 test per 5s per user/guild)
  const rateLimitKey = `${guildId}:${session.id}`;
  const now = Date.now();
  const lastTest = testMessageRateLimits.get(rateLimitKey) || 0;
  if (now - lastTest < 5000) {
    const remaining = Math.ceil((5000 - (now - lastTest)) / 1000);
    return NextResponse.json(
      { error: `Please wait ${remaining}s before sending another test message.` },
      { status: 429 }
    );
  }

  const token = getBotToken();
  if (!token) {
    return NextResponse.json({ error: 'Bot token not configured on server.' }, { status: 500 });
  }

  try {
    const { channelId, embed = {}, is_embed } = await req.json();

    if (!channelId || typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId.trim())) {
      return NextResponse.json({ error: 'Please select a valid welcome text channel.' }, { status: 400 });
    }

    const cleanChannelId = channelId.trim();

    // 3. Verify channel belongs to this specific guild (prevent cross-guild channel message injection)
    const guildChannels = await fetchGuildChannels(guildId);
    const validChannel = guildChannels.find((c) => c.id === cleanChannelId);
    if (!validChannel) {
      return NextResponse.json(
        { error: 'The specified channel does not exist in this server.' },
        { status: 400 }
      );
    }

    testMessageRateLimits.set(rateLimitKey, now);

    // Fetch guild details for name substitution
    const guildDetails = await fetchGuildDetails(guildId);
    const serverName = guildDetails?.name || 'Discord Server';

    // Format fields with placeholder preview values
    const replacePlaceholders = (text: string) => {
      return (text || '')
        .replace(/\{user\}/gi, `<@${session.id}>`)
        .replace(/\{username\}/gi, session.username)
        .replace(/\{usermention\}/gi, `<@${session.id}>`)
        .replace(/\{usertag\}/gi, session.username)
        .replace(/\{server\}/gi, serverName)
        .replace(/\{servername\}/gi, serverName)
        .replace(/\{server\.name\}/gi, serverName)
        .replace(/\{server\.count\}/gi, '1,234')
        .replace(/\{servermember\}/gi, '1,234')
        .replace(/\{randomuser\}/gi, `<@${session.id}>`);
    };

    const title = replacePlaceholders(embed.title || 'Welcome to {server}!');
    const description = replacePlaceholders(embed.description || 'Hey {user}, welcome to the server! Make sure to read the rules.');
    const footer = embed.footer_text ? replacePlaceholders(embed.footer_text) : null;

    // Plain Text Mode (No Embed)
    if (is_embed === false || is_embed === 'false') {
      const res = await fetch(`https://discord.com/api/v10/channels/${cleanChannelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: description,
          allowed_mentions: { parse: ['users'] },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        return NextResponse.json(
          { error: err.message || `Discord API Error (${res.status}): Bot cannot send messages in this channel.` },
          { status: res.status }
        );
      }

      return NextResponse.json({ success: true, message: 'Test plain text welcome message sent!' });
    }

    // Rich Embed Mode
    let colorInt = 0x2b2d31;
    if (embed.color) {
      const cleanHex = String(embed.color).replace('#', '');
      const parsed = parseInt(cleanHex, 16);
      if (!isNaN(parsed)) colorInt = parsed;
    }

    const discordEmbed: any = {
      title: title.slice(0, 256),
      description: description.slice(0, 4096),
      color: colorInt,
      timestamp: new Date().toISOString(),
    };

    if (footer) {
      discordEmbed.footer = { text: footer.slice(0, 2048) };
    }

    if (embed.image_url && typeof embed.image_url === 'string' && embed.image_url.startsWith('http')) {
      discordEmbed.image = { url: embed.image_url.trim() };
    }

    if (embed.thumbnail_url) {
      if (embed.thumbnail_url === '{user.avatar}') {
        if (session.avatar) {
          discordEmbed.thumbnail = {
            url: `https://cdn.discordapp.com/avatars/${session.id}/${session.avatar}.png?size=128`,
          };
        } else {
          discordEmbed.thumbnail = { url: 'https://cdn.discordapp.com/embed/avatars/0.png' };
        }
      } else if (typeof embed.thumbnail_url === 'string' && embed.thumbnail_url.startsWith('http')) {
        discordEmbed.thumbnail = { url: embed.thumbnail_url.trim() };
      }
    }

    const res = await fetch(`https://discord.com/api/v10/channels/${cleanChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [discordEmbed],
        allowed_mentions: { parse: [] }, // Prevent accidental mass pings
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.message || `Discord API Error (${res.status}): Make sure the bot has permissions in that channel.` },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Test welcome message sent to channel!' });
  } catch (error) {
    console.error('Test welcome error:', error);
    return NextResponse.json({ error: 'Failed to dispatch test welcome message.' }, { status: 500 });
  }
}
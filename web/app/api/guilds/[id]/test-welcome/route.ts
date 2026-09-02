import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import dotenv from 'dotenv';
dotenv.config();

function getBotToken(): string {
  return process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || '';
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: _guildId } = await params;
  const token = getBotToken();

  if (!token) {
    return NextResponse.json({ error: 'Bot token not configured on server.' }, { status: 500 });
  }

  try {
    const { channelId, embed } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: 'Please select a welcome channel first.' }, { status: 400 });
    }

    // Format embed fields with placeholder preview values
    const title = (embed.title || 'Welcome to {server}!')
      .replace(/\{user\}/gi, session.username)
      .replace(/\{server\}/gi, 'Server');

    const description = (embed.description || 'Welcome {user} to {server}!')
      .replace(/\{user\}/gi, `<@${session.id}>`)
      .replace(/\{user\.name\}/gi, session.username)
      .replace(/\{server\}/gi, 'Server')
      .replace(/\{server\.count\}/gi, '1,234');

    const footer = (embed.footer_text || 'Member #{server.count}')
      .replace(/\{server\.count\}/gi, '1,234')
      .replace(/\{user\}/gi, session.username);

    // Convert hex color to integer
    let colorInt = 0x5865f2;
    if (embed.color) {
      const cleanHex = embed.color.replace('#', '');
      const parsed = parseInt(cleanHex, 16);
      if (!isNaN(parsed)) colorInt = parsed;
    }

    const discordEmbed: any = {
      title,
      description,
      color: colorInt,
      footer: { text: footer },
      timestamp: new Date().toISOString(),
    };

    if (embed.image_url && embed.image_url.startsWith('http')) {
      discordEmbed.image = { url: embed.image_url };
    }

    if (embed.thumbnail_url) {
      if (embed.thumbnail_url === '{user.avatar}') {
        if (session.avatar) {
          discordEmbed.thumbnail = {
            url: `https://cdn.discordapp.com/avatars/${session.id}/${session.avatar}.png?size=128`,
          };
        }
      } else if (embed.thumbnail_url.startsWith('http')) {
        discordEmbed.thumbnail = { url: embed.thumbnail_url };
      }
    }

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `👋 **Welcome System Live Test** (Triggered by <@${session.id}> via Web Dashboard)`,
        embeds: [discordEmbed],
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
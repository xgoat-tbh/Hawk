import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchGuildChannels } from '@/lib/discord';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { channelId, content } = await req.json();
    if (typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId) || typeof content !== 'string' || !content.trim() || content.length > 2000) {
      return NextResponse.json({ error: 'Channel and message content are required' }, { status: 400 });
    }

    const channels = await fetchGuildChannels(guildId);
    if (!channels.some(channel => channel.id === channelId && [0, 5].includes(channel.type))) return NextResponse.json({ error: 'Select a text channel in this server' }, { status: 400 });
    const hawkClient = (globalThis as any).hawkClient;
    let sent = false;

    if (hawkClient?.channels?.cache) {
      const channel = hawkClient.channels.cache.get(channelId);
      if (channel && channel.isTextBased()) {
        await channel.send({ content: content.trim(), allowedMentions: { parse: [] } });
        sent = true;
      }
    }

    if (!sent) {
      const token = process.env.BOT_TOKEN;
      if (!token) throw new Error('BOT_TOKEN not configured');
      const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim(), allowed_mentions: { parse: [] } }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Discord API failed to post message');
      }
      sent = true;
    }

    // Discord has already accepted the message; audit failures cannot undo it.
    try { await db`
      INSERT INTO activity_log (guild_id, type, actor_name, target_name, details)
      VALUES (
        ${guildId},
        'message',
        ${session.username ? `@${session.username}` : 'Owner'},
        'posted an announcement',
        ${JSON.stringify({ channelId, snippet: content.slice(0, 100) })}
      )
    `;

    } catch (error) { console.error('Message sent; audit delivery failed:', error); }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Send message quick action error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}

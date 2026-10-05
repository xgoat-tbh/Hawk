import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { action, channelId, autoPay } = body;

    if (typeof channelId !== 'string' || !/^\d{17,20}$/.test(channelId)) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }

    if (action === 'delete') {
      const rows = await db`SELECT channel_id FROM pvc_sessions WHERE guild_id = ${guildId} AND channel_id = ${channelId}`;
      if (!rows.length) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      const token = process.env.BOT_TOKEN;
      if (!token) throw new Error('Bot token unavailable');
      const headers = { Authorization: `Bot ${token}` };
      const channel = await fetch(`https://discord.com/api/v10/channels/${channelId}`, { headers, cache: 'no-store' });
      if (channel.ok) {
        const details = await channel.json();
        if (details.guild_id !== guildId || details.type !== 2) return NextResponse.json({ error: 'Voice channel is not in this server' }, { status: 403 });
        const deleted = await fetch(`https://discord.com/api/v10/channels/${channelId}`, { method: 'DELETE', headers });
        if (!deleted.ok && deleted.status !== 404) throw new Error('Discord rejected channel termination');
      } else if (channel.status !== 404) throw new Error('Unable to verify voice channel');
      await db`
        DELETE FROM pvc_sessions
        WHERE guild_id = ${guildId} AND channel_id = ${channelId}
      `;
      return NextResponse.json({ success: true, message: 'PVC session terminated.' });
    }

    if (action === 'update') {
      await db`
        UPDATE pvc_sessions
        SET
          auto_pay_enabled = COALESCE(${autoPay !== undefined ? Boolean(autoPay) : null}, auto_pay_enabled)
        WHERE guild_id = ${guildId} AND channel_id = ${channelId}
      `;
      return NextResponse.json({ success: true, message: 'PVC session updated.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Failed to manage PVC session:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

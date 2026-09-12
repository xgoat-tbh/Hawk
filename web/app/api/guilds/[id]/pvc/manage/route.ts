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

    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }

    if (action === 'delete') {
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

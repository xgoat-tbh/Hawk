import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const [config] = await db`
      SELECT
        pvc_hourly_rate,
        pvc_jtc_channel_id,
        pvc_category_id,
        pvc_command_channel_id,
        pvc_panel_channel_id
      FROM economy_config
      WHERE guild_id = ${guildId}
    `;

    const activeSessions = await db`
      SELECT
        channel_id,
        owner_id,
        auto_pay_enabled,
        is_locked,
        is_hidden,
        user_limit,
        created_at,
        expires_at
      FROM pvc_sessions
      WHERE guild_id = ${guildId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      config: config || null,
      sessions: activeSessions.map((s: any) => ({
        channelId: s.channel_id,
        ownerId: s.owner_id,
        autoPayEnabled: Boolean(s.auto_pay_enabled),
        isLocked: Boolean(s.is_locked),
        isHidden: Boolean(s.is_hidden),
        userLimit: Number(s.user_limit ?? 0),
        createdAt: s.created_at,
        expiresAt: s.expires_at,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Failed to get live PVC data:', err);
    return NextResponse.json({ error: 'Failed to retrieve PVC state' }, { status: 500 });
  }
}

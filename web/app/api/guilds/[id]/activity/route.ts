import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db, ensureDatabaseSchema } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await ensureDatabaseSchema();

  const searchParams = req.nextUrl.searchParams;
  const filterType = searchParams.get('type') || 'all';
  const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  try {
    let rows;
    if (filterType && filterType !== 'all') {
      rows = await db`
        SELECT id, type, actor_name, target_name, details, created_at
        FROM activity_log
        WHERE guild_id = ${guildId} AND type = ${filterType}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      rows = await db`
        SELECT id, type, actor_name, target_name, details, created_at
        FROM activity_log
        WHERE guild_id = ${guildId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const items = rows.map((r: any) => {
      const diffMs = Date.now() - new Date(r.created_at).getTime();
      const diffMins = Math.max(1, Math.round(diffMs / (60 * 1000)));
      const relativeTime =
        diffMins < 60
          ? `${diffMins}m ago`
          : diffMins < 1440
          ? `${Math.round(diffMins / 60)}h ago`
          : `${Math.round(diffMins / 1440)}d ago`;

      return {
        id: r.id,
        type: r.type,
        actorName: r.actor_name || 'System',
        targetName: r.target_name || '',
        details: r.details || {},
        relativeTime,
        timestamp: r.created_at,
      };
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error('Failed to get activity log:', err);
    return NextResponse.json({ error: 'Failed to retrieve activity' }, { status: 500 });
  }
}

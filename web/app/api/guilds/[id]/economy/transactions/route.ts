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
    const rows = await db`
      SELECT
        id,
        user_id,
        type,
        amount,
        source,
        target_id,
        note,
        created_at
      FROM economy_transactions
      WHERE guild_id = ${guildId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({
      transactions: rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        actionType: r.type,
        amount: Number(r.amount),
        targetType: r.source,
        targetId: r.target_id,
        reason: r.note,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Failed to get transactions:', err);
    return NextResponse.json({ error: 'Failed to retrieve transactions' }, { status: 500 });
  }
}

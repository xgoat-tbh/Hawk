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
        user_id,
        cash,
        bank,
        (cash + bank) AS net_worth,
        ROW_NUMBER() OVER (ORDER BY (cash + bank) DESC) as rank
      FROM economy_balances
      WHERE guild_id = ${guildId}
      ORDER BY (cash + bank) DESC
      LIMIT 100
    `;

    return NextResponse.json({
      leaderboard: rows.map((r: any) => ({
        userId: r.user_id,
        cash: Number(r.cash),
        bank: Number(r.bank),
        netWorth: Number(r.net_worth),
        rank: Number(r.rank),
      })),
    });
  } catch (err: any) {
    console.error('Failed to get leaderboard:', err);
    return NextResponse.json({ error: 'Failed to retrieve leaderboard' }, { status: 500 });
  }
}

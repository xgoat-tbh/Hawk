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
      SELECT currency_symbol, start_balance FROM economy_config WHERE guild_id = ${guildId}
    `;

    const [stats] = await db`
      SELECT
        COUNT(*)::int AS total_accounts,
        COALESCE(SUM(cash), 0)::bigint AS total_cash,
        COALESCE(SUM(bank), 0)::bigint AS total_bank,
        COALESCE(SUM(cash + bank), 0)::bigint AS total_net_worth,
        COALESCE(AVG(cash + bank), 0)::bigint AS avg_net_worth
      FROM economy_balances
      WHERE guild_id = ${guildId}
    `;

    return NextResponse.json({
      currencySymbol: config?.currency_symbol || '$',
      totalAccounts: stats?.total_accounts || 0,
      totalCash: Number(stats?.total_cash || 0),
      totalBank: Number(stats?.total_bank || 0),
      totalNetWorth: Number(stats?.total_net_worth || 0),
      avgNetWorth: Number(stats?.avg_net_worth || 0),
    });
  } catch (err: any) {
    console.error('Failed to get economy stats:', err);
    return NextResponse.json({ error: 'Failed to retrieve stats' }, { status: 500 });
  }
}

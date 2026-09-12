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
        bank_capacity,
        (cash + bank) AS net_worth,
        updated_at
      FROM economy_balances
      WHERE guild_id = ${guildId}
      ORDER BY (cash + bank) DESC
      LIMIT 200
    `;

    return NextResponse.json({
      users: rows.map((r: any) => ({
        userId: r.user_id,
        cash: Number(r.cash),
        bank: Number(r.bank),
        bankCapacity: Number(r.bank_capacity),
        netWorth: Number(r.net_worth),
        updatedAt: r.updated_at,
      })),
    });
  } catch (err: any) {
    console.error('Failed to get economy users:', err);
    return NextResponse.json({ error: 'Failed to retrieve economy users' }, { status: 500 });
  }
}

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
    const { action, userId, cash, bank } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    if (action === 'reset_all') {
      await db`
        UPDATE economy_balances
        SET cash = 0, bank = 0, updated_at = NOW()
        WHERE guild_id = ${guildId}
      `;

      await db`
        INSERT INTO economy_transactions (guild_id, user_id, type, amount, source, target_id, note)
        VALUES (${guildId}, ${session.id}, 'admin_reset_all', 0, 'economy', 'all', 'Admin reset all server balances')
      `;

      return NextResponse.json({ success: true, message: 'All server balances reset to 0.' });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'set_balance') {
      const parsedCash = Math.max(0, parseInt(cash ?? 0, 10));
      const parsedBank = Math.max(0, parseInt(bank ?? 0, 10));

      await db`
        INSERT INTO economy_balances (guild_id, user_id, cash, bank, bank_capacity)
        VALUES (${guildId}, ${userId}, ${parsedCash}, ${parsedBank}, 0)
        ON CONFLICT (guild_id, user_id)
        DO UPDATE SET
          cash = ${parsedCash},
          bank = ${parsedBank},
          updated_at = NOW()
      `;

      await db`
        INSERT INTO economy_transactions (guild_id, user_id, type, amount, source, target_id, note)
        VALUES (${guildId}, ${userId}, 'admin_set', ${parsedCash + parsedBank}, 'economy', ${session.id}, 'Admin updated balance from dashboard')
      `;

      return NextResponse.json({ success: true, message: 'User balance updated successfully.' });
    }

    if (action === 'reset_user') {
      await db`
        UPDATE economy_balances
        SET cash = 0, bank = 0, updated_at = NOW()
        WHERE guild_id = ${guildId} AND user_id = ${userId}
      `;

      await db`
        INSERT INTO economy_transactions (guild_id, user_id, type, amount, source, target_id, note)
        VALUES (${guildId}, ${userId}, 'admin_reset', 0, 'economy', ${session.id}, 'Admin reset user balance')
      `;

      return NextResponse.json({ success: true, message: 'User balance reset to 0.' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Failed to update economy user:', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

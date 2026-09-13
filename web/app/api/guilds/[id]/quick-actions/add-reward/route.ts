import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db } from '@/lib/db';

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
    const { userId, userName, amount, rewardType } = await req.json();
    const cleanAmount = parseInt(amount || '500', 10);
    const recipientName = userName?.trim() ? (userName.startsWith('@') ? userName : `@${userName}`) : '@member';

    if (userId) {
      await db`
        INSERT INTO economy_balances (guild_id, user_id, cash, bank)
        VALUES (${guildId}, ${userId}, ${cleanAmount}, 0)
        ON CONFLICT (guild_id, user_id)
        DO UPDATE SET cash = economy_balances.cash + ${cleanAmount}
      `;
    }

    const type = rewardType === 'role' ? 'role_reward' : 'streak_reward';
    const target = rewardType === 'role' ? 'claimed Premium Role' : `+${cleanAmount} Coins Reward`;

    await db`
      INSERT INTO activity_log (guild_id, type, actor_name, target_name, details)
      VALUES (
        ${guildId},
        ${type},
        ${recipientName},
        ${target},
        ${JSON.stringify({ amount: cleanAmount, rewardType })}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Add reward quick action error:', err);
    return NextResponse.json({ error: err.message || 'Failed to add reward' }, { status: 500 });
  }
}

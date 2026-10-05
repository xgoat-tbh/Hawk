import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { fetchGuildMember } from '@/lib/discord';
import { db } from '@/lib/db';
import { logDashboardAction } from '@/lib/auditLogger';
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(); const { id: guildId } = await params;
  if (!session || !await canManageGuild(session.id, guildId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { userId, amount } = await req.json();
    if (typeof userId !== 'string' || !/^\d{17,20}$/.test(userId) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000) return NextResponse.json({ error: 'Select a member and a whole amount from 1–1000000' }, { status: 400 });
    if (!await fetchGuildMember(guildId, userId)) return NextResponse.json({ error: 'Member not found in this server' }, { status: 400 });
    await db.begin(async sql => {
      await sql`INSERT INTO economy_balances (guild_id, user_id, cash, bank) VALUES (${guildId}, ${userId}, ${amount}, 0) ON CONFLICT (guild_id, user_id) DO UPDATE SET cash = economy_balances.cash + ${amount}`;
      await logDashboardAction({ userId: session.id, guildId, action: 'reward_granted', module: 'economy', after: { recipientId: userId, amount } }, sql);
    });
    return NextResponse.json({ success: true });
  } catch (error) { console.error('Reward failed:', error); return NextResponse.json({ error: 'Unable to grant reward' }, { status: 500 }); }
}

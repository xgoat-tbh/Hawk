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
    const cooldownRows = await db`
      SELECT game, cooldown_seconds FROM game_cooldowns WHERE guild_id = ${guildId}
    `;

    const cooldownMap: Record<string, number> = {
      coinflip: 15,
      mines: 15,
    };

    for (const row of cooldownRows) {
      cooldownMap[row.game] = Number(row.cooldown_seconds);
    }

    const [econConfig] = await db`
      SELECT work_cooldown, slut_cooldown, crime_cooldown, rob_cooldown
      FROM economy_config
      WHERE guild_id = ${guildId}
    `;

    return NextResponse.json({
      cooldowns: {
        ...cooldownMap,
        work: Number(econConfig?.work_cooldown ?? 3600),
        slut: Number(econConfig?.slut_cooldown ?? 3600),
        crime: Number(econConfig?.crime_cooldown ?? 7200),
        rob: Number(econConfig?.rob_cooldown ?? 86400),
      },
    });
  } catch (err: any) {
    console.error('Failed to get game configs:', err);
    return NextResponse.json({ error: 'Failed to retrieve configs' }, { status: 500 });
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
    const { coinflip, mines, work, slut, crime, rob } = body;

    if (coinflip !== undefined) {
      await db`
        INSERT INTO game_cooldowns (guild_id, game, cooldown_seconds)
        VALUES (${guildId}, 'coinflip', ${Math.max(0, parseInt(coinflip, 10))})
        ON CONFLICT (guild_id, game)
        DO UPDATE SET cooldown_seconds = EXCLUDED.cooldown_seconds, updated_at = NOW()
      `;
    }

    if (mines !== undefined) {
      await db`
        INSERT INTO game_cooldowns (guild_id, game, cooldown_seconds)
        VALUES (${guildId}, 'mines', ${Math.max(0, parseInt(mines, 10))})
        ON CONFLICT (guild_id, game)
        DO UPDATE SET cooldown_seconds = EXCLUDED.cooldown_seconds, updated_at = NOW()
      `;
    }

    await db`
      UPDATE economy_config
      SET
        work_cooldown = COALESCE(${work !== undefined ? parseInt(work, 10) : null}, work_cooldown),
        slut_cooldown = COALESCE(${slut !== undefined ? parseInt(slut, 10) : null}, slut_cooldown),
        crime_cooldown = COALESCE(${crime !== undefined ? parseInt(crime, 10) : null}, crime_cooldown),
        rob_cooldown = COALESCE(${rob !== undefined ? parseInt(rob, 10) : null}, rob_cooldown),
        updated_at = NOW()
      WHERE guild_id = ${guildId}
    `;

    return NextResponse.json({ success: true, message: 'Game cooldowns updated successfully.' });
  } catch (err: any) {
    console.error('Failed to update game configs:', err);
    return NextResponse.json({ error: 'Failed to update configs' }, { status: 500 });
  }
}

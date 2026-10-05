import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild, canViewGuild } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canViewGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const cooldownRows = await db`
      SELECT game_name, cooldown_seconds, enabled FROM game_cooldowns WHERE guild_id = ${guildId}
    `;

    const cooldownMap: Record<string, number> = {
      coinflip: 15,
      mines: 15,
    };

    for (const row of cooldownRows) {
      cooldownMap[row.game_name] = Number(row.cooldown_seconds);
    }

    const [econConfig] = await db`
      SELECT work_cooldown, slut_cooldown, crime_cooldown, rob_cooldown, min_bet, max_bet
      FROM economy_config
      WHERE guild_id = ${guildId}
    `;

    return NextResponse.json({
      settings: { min_bet: Number(econConfig?.min_bet ?? 10), max_bet: Number(econConfig?.max_bet ?? 50000), coinflip_enabled: cooldownRows.find(r => r.game_name === 'coinflip')?.enabled ?? true, mines_enabled: cooldownRows.find(r => r.game_name === 'mines')?.enabled ?? true },
      cooldowns: {
        ...cooldownMap,
        work: Number(econConfig?.work_cooldown ?? 30),
        slut: Number(econConfig?.slut_cooldown ?? 45),
        crime: Number(econConfig?.crime_cooldown ?? 60),
        rob: Number(econConfig?.rob_cooldown ?? 120),
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
    for (const field of ['coinflip','mines','work','slut','crime','rob','min_bet','max_bet']) {
      if (body[field] !== undefined && (!Number.isSafeInteger(body[field]) || body[field] < (field.endsWith('_bet') ? 1 : 0) || body[field] > (field.endsWith('_bet') ? 1000000000 : ['coinflip','mines'].includes(field) ? 3600 : 86400))) return NextResponse.json({ error: 'Invalid ' + field }, { status: 400 });
    }
    for (const field of ['coinflip_enabled','mines_enabled']) if (body[field] !== undefined && typeof body[field] !== 'boolean') return NextResponse.json({ error: 'Invalid ' + field }, { status: 400 });
    await db.begin(async sql => {
      await sql`INSERT INTO economy_config (guild_id) VALUES (${guildId}) ON CONFLICT (guild_id) DO NOTHING`;
      const [current] = await sql`SELECT min_bet, max_bet FROM economy_config WHERE guild_id = ${guildId} FOR UPDATE`;
      if ((body.min_bet ?? Number(current.min_bet)) > (body.max_bet ?? Number(current.max_bet))) throw new Error('Minimum bet cannot exceed maximum bet');
      for (const game of ['coinflip','mines']) {
        if (body[game] === undefined && body[game + '_enabled'] === undefined) continue;
        await sql`INSERT INTO game_cooldowns (guild_id, game_name, cooldown_seconds, enabled) VALUES (${guildId}, ${game}, ${body[game] ?? 15}, ${body[game + '_enabled'] ?? true}) ON CONFLICT (guild_id, game_name) DO UPDATE SET cooldown_seconds = COALESCE(${body[game] ?? null}, game_cooldowns.cooldown_seconds), enabled = COALESCE(${body[game + '_enabled'] ?? null}, game_cooldowns.enabled), updated_at = NOW()`;
      }
      const patch: Record<string, number> = {};
      for (const field of ['work','slut','crime','rob']) if (body[field] !== undefined) patch[field + '_cooldown'] = body[field];
      for (const field of ['min_bet','max_bet']) if (body[field] !== undefined) patch[field] = body[field];
      if (Object.keys(patch).length) await sql`UPDATE economy_config SET ${sql(patch)}, updated_at = NOW() WHERE guild_id = ${guildId}`;
      await sql`SELECT pg_notify('dashboard_events', ${JSON.stringify({ guildId, event: 'config:changed' })})`;
    });

    return NextResponse.json({ success: true, message: 'Game cooldowns updated successfully.' });
  } catch (err: any) {
    console.error('Failed to update game configs:', err);
    return NextResponse.json({ error: 'Failed to update configs' }, { status: 500 });
  }
}

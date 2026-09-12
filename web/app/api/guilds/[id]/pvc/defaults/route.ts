import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;

  try {
    const [row] = await db`
      SELECT name_template, user_limit, is_locked, is_hidden, auto_pay_enabled
      FROM pvc_user_defaults
      WHERE guild_id = ${guildId} AND user_id = ${session.id}
    `;

    return NextResponse.json({
      defaults: row
        ? {
            defaultName: row.name_template,
            defaultLimit: Number(row.user_limit ?? 0),
            defaultBitrate: 64000,
            isLocked: Boolean(row.is_locked),
          }
        : null,
    });
  } catch (err: any) {
    console.error('Failed to get user PVC defaults:', err);
    return NextResponse.json({ error: 'Failed to retrieve defaults' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;

  try {
    const body = await req.json();
    const { defaultName, defaultLimit, isLocked } = body;

    const nameVal = (defaultName || '').trim() || "{username}'s Channel";
    const limitVal = defaultLimit !== undefined ? Math.max(0, Math.min(99, parseInt(defaultLimit, 10))) : 0;
    const lockedVal = Boolean(isLocked);

    await db`
      INSERT INTO pvc_user_defaults (guild_id, user_id, name_template, user_limit, is_locked, is_hidden, auto_pay_enabled, updated_at)
      VALUES (${guildId}, ${session.id}, ${nameVal}, ${limitVal}, ${lockedVal}, false, false, NOW())
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET
        name_template = EXCLUDED.name_template,
        user_limit = EXCLUDED.user_limit,
        is_locked = EXCLUDED.is_locked,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true, message: 'Personal PVC defaults saved!' });
  } catch (err: any) {
    console.error('Failed to set user PVC defaults:', err);
    return NextResponse.json({ error: 'Failed to save defaults' }, { status: 500 });
  }
}

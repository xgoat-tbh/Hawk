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
      SELECT default_name, default_limit, default_bitrate, is_locked
      FROM pvc_user_defaults
      WHERE guild_id = ${guildId} AND user_id = ${session.id}
    `;

    return NextResponse.json({
      defaults: row
        ? {
            defaultName: row.default_name,
            defaultLimit: Number(row.default_limit),
            defaultBitrate: Number(row.default_bitrate),
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
    const { defaultName, defaultLimit, defaultBitrate, isLocked } = body;

    const nameVal = (defaultName || '').trim() || null;
    const limitVal = defaultLimit !== undefined ? Math.max(0, Math.min(99, parseInt(defaultLimit, 10))) : 0;
    const bitrateVal = defaultBitrate !== undefined ? Math.max(8000, Math.min(384000, parseInt(defaultBitrate, 10))) : 64000;
    const lockedVal = Boolean(isLocked);

    await db`
      INSERT INTO pvc_user_defaults (guild_id, user_id, default_name, default_limit, default_bitrate, is_locked)
      VALUES (${guildId}, ${session.id}, ${nameVal}, ${limitVal}, ${bitrateVal}, ${lockedVal})
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET
        default_name = EXCLUDED.default_name,
        default_limit = EXCLUDED.default_limit,
        default_bitrate = EXCLUDED.default_bitrate,
        is_locked = EXCLUDED.is_locked,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true, message: 'Personal PVC defaults saved!' });
  } catch (err: any) {
    console.error('Failed to set user PVC defaults:', err);
    return NextResponse.json({ error: 'Failed to save defaults' }, { status: 500 });
  }
}

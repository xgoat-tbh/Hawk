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
    const body = await req.json().catch(() => ({}));
    const channelName = body?.name?.trim() || `Room #${Math.floor(100 + Math.random() * 900)}`;

    const hawkClient = (globalThis as any).hawkClient;
    const [econConfig] = await db`
      SELECT pvc_category_id FROM economy_config WHERE guild_id = ${guildId}
    `;

    let createdChannelId: string | null = null;

    if (hawkClient?.guilds?.cache) {
      const g = hawkClient.guilds.cache.get(guildId);
      if (g) {
        const chan = await g.channels.create({
          name: channelName,
          type: 2, // GUILD_VOICE
          parent: econConfig?.pvc_category_id || undefined,
        });
        createdChannelId = chan.id;
      }
    }

    if (!createdChannelId) {
      const token = process.env.BOT_TOKEN;
      if (!token) throw new Error('BOT_TOKEN not configured');
      const payload: any = {
        name: channelName,
        type: 2,
      };
      if (econConfig?.pvc_category_id) {
        payload.parent_id = econConfig.pvc_category_id;
      }
      const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Discord API failed to create voice channel');
      }
      const data = await res.json();
      createdChannelId = data.id;
    }

    await db`
      INSERT INTO activity_log (guild_id, type, actor_name, target_name, details)
      VALUES (
        ${guildId},
        'voice_create',
        ${channelName},
        'Temporary voice room created',
        ${JSON.stringify({ channelId: createdChannelId })}
      )
    `;

    return NextResponse.json({ success: true, channelId: createdChannelId, channelName });
  } catch (err: any) {
    console.error('Create voice quick action error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create voice channel' }, { status: 500 });
  }
}

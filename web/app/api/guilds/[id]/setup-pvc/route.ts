import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db } from '@/lib/db';
import '@/lib/env';

function getBotToken(): string {
  return process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || '';
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;

  // Enforce server-side authorization check
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permissions to manage channels in this server.' },
      { status: 403 }
    );
  }

  const token = getBotToken();

  if (!token) {
    return NextResponse.json({ error: 'Bot token not configured on server.' }, { status: 500 });
  }

  try {
    // 1. Create Category Channel in Discord (type 4)
    const catRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '🔊 PRIVATE VOICE',
        type: 4, // GUILD_CATEGORY
      }),
    });

    if (!catRes.ok) {
      const err = await catRes.json();
      return NextResponse.json(
        { error: err.message || `Discord API Error (${catRes.status}): Bot needs Manage Channels permission.` },
        { status: catRes.status }
      );
    }

    const category = await catRes.json();
    const categoryId = category.id;

    // 2. Create Join to Create Voice Channel under that Category (type 2)
    const vcRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: '➕ Join to Create',
        type: 2, // GUILD_VOICE
        parent_id: categoryId,
      }),
    });

    if (!vcRes.ok) {
      const err = await vcRes.json();
      return NextResponse.json(
        { error: err.message || `Discord API Error (${vcRes.status}): Failed to create Join to Create voice channel.` },
        { status: vcRes.status }
      );
    }

    const jtcChannel = await vcRes.json();
    const jtcChannelId = jtcChannel.id;

    // 3. Save to database
    await db`
      INSERT INTO economy_config (guild_id, pvc_category_id, pvc_jtc_channel_id)
      VALUES (${guildId}, ${categoryId}, ${jtcChannelId})
      ON CONFLICT (guild_id)
      DO UPDATE SET
        pvc_category_id = EXCLUDED.pvc_category_id,
        pvc_jtc_channel_id = EXCLUDED.pvc_jtc_channel_id,
        updated_at = NOW()
    `;

    return NextResponse.json({
      success: true,
      categoryId,
      jtcChannelId,
      message: 'Private Voice Channels created and configured successfully in Discord!',
    });
  } catch (error) {
    console.error('Setup PVC error:', error);
    return NextResponse.json({ error: 'Failed to auto-create PVC channels.' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { ensureDatabaseSchema } from '@/lib/db';
import { handleConfigModule } from './dispatcher';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;

  // Server-side authorization check
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden: You are not authorized to configure this server.' },
      { status: 403 }
    );
  }

  await ensureDatabaseSchema();

  try {
    const body = await req.json();
    const { module, data } = body;
    if (!module || !data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const result = await handleConfigModule(guildId, module, data);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      updatedAt: new Date().toISOString(),
      message: 'Configuration saved successfully.',
    });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json({ error: 'Failed to save configuration.' }, { status: 500 });
  }
}
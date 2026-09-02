import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { fetchGuildAuditLogs, logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const moduleFilter = url.searchParams.get('module') || undefined;
  const severityFilter = url.searchParams.get('severity') || undefined;
  const searchQuery = url.searchParams.get('q') || undefined;

  const logs = await fetchGuildAuditLogs(guildId, {
    module: moduleFilter,
    severity: severityFilter,
    search: searchQuery,
  });

  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const entry = await logAuditEvent({
      guildId,
      userId: session.id,
      userName: session.username,
      action: body.action || 'Configuration Change',
      module: body.module || 'general',
      target: body.target,
      previousValue: body.previousValue,
      newValue: body.newValue,
      severity: body.severity || 'INFO',
      source: 'DASHBOARD',
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Failed to write audit entry:', error);
    return NextResponse.json({ error: 'Internal audit log failure' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession, canViewGuild } from '@/lib/auth';
import { fetchGuildAuditLogs } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canViewGuild(session.id, guildId);
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

import { NextRequest, NextResponse } from 'next/server';
import { getSession, canViewGuild } from '@/lib/auth';
import { searchGuildMembers } from '@/lib/discord';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!await canViewGuild(session.id, id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const query = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 100);
  if (query.length < 2) return NextResponse.json({ users: [] });
  try { return NextResponse.json({ users: await searchGuildMembers(id, query) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Member search unavailable' }, { status: 502 }); }
}

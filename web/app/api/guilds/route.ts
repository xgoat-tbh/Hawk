import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchBotGuilds } from '@/lib/discord';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const guilds = await fetchBotGuilds();
    guilds.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ guilds });
  } catch (error) {
    console.error('Fetch guilds error:', error);
    return NextResponse.json({ error: 'Failed to fetch bot guilds' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSession, isAuthorizedUser, canManageGuild } from '@/lib/auth';
import { fetchBotGuilds } from '@/lib/discord';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allGuilds = await fetchBotGuilds();
    const isSuperAdmin = await isAuthorizedUser(session.id);

    let accessibleGuilds = allGuilds;
    if (!isSuperAdmin) {
      const checks = await Promise.all(
        allGuilds.map(async (g) => {
          const allowed = await canManageGuild(session.id, g.id);
          return allowed ? g : null;
        })
      );
      accessibleGuilds = checks.filter((g): g is NonNullable<typeof g> => g !== null);
    }

    accessibleGuilds.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ guilds: accessibleGuilds });
  } catch (error) {
    console.error('Fetch guilds error:', error);
    return NextResponse.json({ error: 'Failed to fetch bot guilds' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchUserGuilds, fetchBotGuildIds } from '@/lib/discord';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [userGuilds, botGuildIds] = await Promise.all([
      fetchUserGuilds(session.accessToken),
      fetchBotGuildIds(),
    ]);

    const mapped = userGuilds.map((guild) => ({
      ...guild,
      hasBot: botGuildIds.has(guild.id),
      iconUrl: guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
        : null,
    }));

    // Sort: servers with bot first, then alphabetical
    mapped.sort((a, b) => {
      if (a.hasBot && !b.hasBot) return -1;
      if (!a.hasBot && b.hasBot) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ guilds: mapped });
  } catch (error) {
    console.error('Fetch guilds error:', error);
    return NextResponse.json({ error: 'Failed to fetch guilds' }, { status: 500 });
  }
}

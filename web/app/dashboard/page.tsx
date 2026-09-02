import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { fetchUserGuilds, fetchBotGuildIds, getBotInviteUrl } from '@/lib/discord';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { LayoutGrid, ExternalLink, SlidersHorizontal, Search } from 'lucide-react';

export default async function DashboardHubPage() {
  const session = await getSession();
  if (!session) {
    redirect('/api/auth/login');
  }

  const [userGuilds, botGuildIds] = await Promise.all([
    fetchUserGuilds(session.accessToken),
    fetchBotGuildIds(),
  ]);

  const mappedGuilds = userGuilds.map((g) => ({
    ...g,
    hasBot: botGuildIds.has(g.id),
    iconUrl: g.icon
      ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
      : null,
  }));

  mappedGuilds.sort((a, b) => {
    if (a.hasBot && !b.hasBot) return -1;
    if (!a.hasBot && b.hasBot) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Select a Server</h1>
            <p className="text-sm text-muted mt-1">
              Showing servers where you have <span className="text-white font-medium">Administrator</span> or{' '}
              <span className="text-white font-medium">Manage Server</span> permissions.
            </p>
          </div>
        </div>

        {/* Server Cards Grid */}
        {mappedGuilds.length === 0 ? (
          <div className="text-center py-20 bg-surface/40 rounded-3xl border border-border mt-8">
            <LayoutGrid className="w-12 h-12 text-muted mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No manageable servers found</h3>
            <p className="text-sm text-muted mt-1 max-w-md mx-auto">
              You need Administrator or Manage Server permissions in a Discord server to configure Hawk.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {mappedGuilds.map((guild) => (
              <div
                key={guild.id}
                className="bg-surface border border-border hover:border-accent/40 rounded-3xl p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-black/40 group"
              >
                <div className="flex items-center gap-4">
                  {guild.iconUrl ? (
                    <img
                      src={guild.iconUrl}
                      alt={guild.name}
                      className="w-14 h-14 rounded-2xl border border-border flex-shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/30 text-accent font-bold text-lg flex items-center justify-center flex-shrink-0">
                      {guild.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-base text-white truncate group-hover:text-accent transition-colors">
                      {guild.name}
                    </h3>
                    <span className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                      {guild.hasBot ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Hawk Active
                        </span>
                      ) : (
                        <span className="text-muted">Bot not invited</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  {guild.hasBot ? (
                    <Link
                      href={`/dashboard/${guild.id}/general`}
                      className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs tracking-wide shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-all flex items-center justify-center gap-1.5"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Configure Server</span>
                    </Link>
                  ) : (
                    <a
                      href={getBotInviteUrl(guild.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-surfaceHover hover:bg-surface border border-border hover:border-muted/40 text-white/90 hover:text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Invite Hawk</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

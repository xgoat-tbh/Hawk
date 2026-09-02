import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { fetchUserGuilds, fetchBotGuildIds, getBotInviteUrl } from '@/lib/discord';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { LayoutGrid, ExternalLink, SlidersHorizontal, Search, ShieldAlert, Cpu } from 'lucide-react';

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1b1f2b] pb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider">Select a Server</h1>
            <p className="text-xs text-muted mt-1 font-medium">
              Servers where you have <span className="text-white font-bold">Administrator</span> or{' '}
              <span className="text-white font-bold">Manage Server</span> permissions.
            </p>
          </div>
        </div>

        {/* Server Cards Grid */}
        {mappedGuilds.length === 0 ? (
          <div className="text-center py-20 box-card mt-8 p-8">
            <ShieldAlert className="w-12 h-12 text-muted mx-auto mb-3" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">No manageable servers found</h3>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              You need Administrator or Manage Server permissions in a Discord server to configure Hawk.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {mappedGuilds.map((guild) => (
              <div
                key={guild.id}
                className="box-card p-5 flex flex-col justify-between group"
              >
                <div className="flex items-center gap-4">
                  {guild.iconUrl ? (
                    <img
                      src={guild.iconUrl}
                      alt={guild.name}
                      className="w-14 h-14 rounded-lg border border-[#232733] flex-shrink-0 object-cover shadow-md group-hover:border-[#5865F2]/50 transition-colors"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/30 text-[#5865F2] font-black text-lg flex items-center justify-center flex-shrink-0">
                      {guild.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-extrabold text-sm text-white truncate group-hover:text-[#5865F2] transition-colors tracking-wide">
                      {guild.name}
                    </h3>
                    <span className="text-[11px] font-semibold flex items-center gap-1.5 mt-1">
                      {guild.hasBot ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Hawk Active
                        </span>
                      ) : (
                        <span className="text-muted">Bot not in server</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  {guild.hasBot ? (
                    <Link
                      href={`/dashboard/${guild.id}/general`}
                      className="btn-box-primary w-full flex items-center justify-center gap-2"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Configure Server</span>
                    </Link>
                  ) : (
                    <a
                      href={getBotInviteUrl(guild.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-box-secondary w-full flex items-center justify-center gap-2"
                    >
                      <Cpu className="w-3.5 h-3.5 text-muted" />
                      <span>Invite Hawk</span>
                      <ExternalLink className="w-3 h-3 text-muted" />
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

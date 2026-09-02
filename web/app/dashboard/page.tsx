import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { fetchBotGuilds } from '@/lib/discord';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { SlidersHorizontal, Server, ArrowRight } from 'lucide-react';

export default async function DashboardHubPage() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }

  const guilds = await fetchBotGuilds();
  guilds.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen flex flex-col bg-[#08090c]">
      <Navbar user={session} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Active Discord Servers</h1>
            <p className="text-xs text-white/40 mt-1">
              Select a connected server to configure modules, economy, and voice channels.
            </p>
          </div>
        </div>

        {/* Server Cards Grid */}
        {guilds.length === 0 ? (
          <div className="text-center py-20 glass-card mt-8 p-8">
            <Server className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No active servers found</h3>
            <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
              Make sure the Hawk Discord bot is added to at least one server.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {guilds.map((guild) => (
              <div
                key={guild.id}
                className="glass-card p-5 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex items-center gap-3.5">
                  {guild.iconUrl ? (
                    <img
                      src={guild.iconUrl}
                      alt={guild.name}
                      className="w-12 h-12 rounded-xl border border-white/10 flex-shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 text-white/70 font-bold text-sm flex items-center justify-center flex-shrink-0">
                      {guild.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-semibold text-sm text-white truncate group-hover:text-[#5865F2] transition-colors">
                      {guild.name}
                    </h3>
                    <span className="text-[11px] text-white/40 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Connected
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/dashboard/${guild.id}/general`}
                    className="btn-outline-primary w-full flex items-center justify-center gap-2"
                  >
                    <span>Configure</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

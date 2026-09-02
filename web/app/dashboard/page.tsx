import React from 'react';
import { redirect } from 'next/navigation';
import { getSession, isAuthorizedUser, canManageGuild } from '@/lib/auth';
import { fetchBotGuilds } from '@/lib/discord';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { Server, ArrowRight } from 'lucide-react';

export default async function DashboardHubPage() {
  const session = await getSession();
  if (!session) {
    redirect('/');
  }

  const allGuilds = await fetchBotGuilds();
  const isSuperAdmin = await isAuthorizedUser(session.id);

  let userGuilds = allGuilds;
  if (!isSuperAdmin) {
    const checks = await Promise.all(
      allGuilds.map(async (g) => {
        const allowed = await canManageGuild(session.id, g.id);
        return allowed ? g : null;
      })
    );
    userGuilds = checks.filter((g): g is NonNullable<typeof g> => g !== null);
  }

  userGuilds.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen flex flex-col bg-[#08090a]">
      <Navbar user={session} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
          <div>
            <h1 className="text-lg font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
              <span>Connected Servers</span>
              <span className="text-xs font-mono text-[#7e8389] px-2 py-0.5 rounded-full bg-[#17191c] border border-[#24272b]">
                {userGuilds.length}
              </span>
            </h1>
            <p className="text-xs text-[#7e8389] mt-1">
              Select an authorized Discord server to configure Hawk bot features and settings.
            </p>
          </div>
        </div>

        {/* Server Cards Grid */}
        {userGuilds.length === 0 ? (
          <div className="text-center py-20 panel-soft mt-6 p-8">
            <Server className="w-8 h-8 text-[#7e8389] mx-auto mb-3" />
            <h3 className="text-sm font-medium text-[#f1f2f3]">No authorized servers found</h3>
            <p className="text-xs text-[#7e8389] mt-1 max-w-sm mx-auto">
              You must have Manage Server permissions or be an authorized bot administrator to manage servers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {userGuilds.map((guild) => (
              <div
                key={guild.id}
                className="panel-soft p-4 flex flex-col justify-between group hover:border-[#373b42] transition-all duration-150"
              >
                <div className="flex items-center gap-3">
                  {guild.iconUrl ? (
                    <img
                      src={guild.iconUrl}
                      alt={guild.name}
                      className="w-11 h-11 rounded-md border border-[#24272b] shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-md bg-[#17191c] border border-[#24272b] text-[#d5d7da] font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                      {guild.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-medium text-sm text-[#f1f2f3] truncate group-hover:text-white transition-colors">
                      {guild.name}
                    </h3>
                    <span className="text-[11px] text-[#7e8389] flex items-center gap-1.5 mt-0.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1c1f23]">
                  <Link
                    href={`/dashboard/${guild.id}/general`}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-1.5 text-xs"
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

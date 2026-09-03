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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17191c] pb-4">
          <div>
            <h1 className="text-base font-semibold text-[#ededed] tracking-tight flex items-center gap-2">
              <span>Connected Discord Servers</span>
              <span className="text-[10px] font-mono text-[#6e747c] px-2 py-0.5 rounded bg-[#121417] border border-[#1f2226]">
                {userGuilds.length}
              </span>
            </h1>
            <p className="text-xs text-[#6e747c] mt-0.5">
              Select an authorized Discord server to configure Hawk bot features and settings.
            </p>
          </div>
        </div>

        {/* Server Cards Grid */}
        {userGuilds.length === 0 ? (
          <div className="text-center py-20 bg-[#0d0e10] border border-[#1f2226] rounded-lg mt-6 p-8">
            <Server className="w-8 h-8 text-[#6e747c] mx-auto mb-3" />
            <h3 className="text-sm font-medium text-[#ededed]">No authorized servers found</h3>
            <p className="text-xs text-[#6e747c] mt-1 max-w-sm mx-auto">
              You must have Manage Server permissions or be an authorized bot administrator to manage servers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-6">
            {userGuilds.map((guild) => (
              <div
                key={guild.id}
                className="bg-[#0d0e10] border border-[#1f2226] rounded-lg p-4 flex flex-col justify-between group hover:border-[#2a2d33] hover:bg-[#121417] transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {guild.iconUrl ? (
                    <img
                      src={guild.iconUrl}
                      alt={guild.name}
                      className="w-10 h-10 rounded-lg border border-[#1f2226] shrink-0 object-cover shadow-tactile-btn"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#121417] border border-[#1f2226] text-[#ededed] font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                      {guild.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-medium text-xs text-[#ededed] truncate group-hover:text-white transition-colors">
                      {guild.name}
                    </h3>
                    <span className="text-[10px] text-[#6e747c] flex items-center gap-1.5 mt-0.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#17191c]">
                  <Link
                    href={`/dashboard/${guild.id}`}
                    className="btn-outline-secondary w-full flex items-center justify-center gap-2 py-1.5 text-xs group-hover:border-[#2a2d33] group-hover:text-[#ededed]"
                  >
                    <span>Open Console</span>
                    <ArrowRight className="w-3 h-3 text-[#6e747c] group-hover:text-[#ededed] transition-colors" />
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

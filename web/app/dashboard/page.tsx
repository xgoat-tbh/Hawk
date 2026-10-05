import React from 'react';
import { redirect } from 'next/navigation';
import { TEST_GUILD_ID, supportedGuildIds } from '@/lib/guilds';
import { getSession, isAuthorizedUser, canViewGuild } from '@/lib/auth';
import { ServerCard } from '@/components/ServerCard';
import { fetchBotGuilds, fetchGuildDetails } from '@/lib/discord';
import { Navbar } from '@/components/Navbar';
import { Server } from 'lucide-react';

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
        const allowed = await canViewGuild(session.id, g.id);
        return allowed ? g : null;
      })
    );
    userGuilds = checks.filter((g): g is NonNullable<typeof g> => g !== null);
  }

  const testId = TEST_GUILD_ID;
  userGuilds = userGuilds.filter(g => supportedGuildIds.includes(g.id)).sort((a, b) => Number(a.id === testId) - Number(b.id === testId));
  userGuilds = await Promise.all(userGuilds.map(async guild => { const details = await fetchGuildDetails(guild.id); return { ...guild, approximateMemberCount: details?.approximate_member_count }; }));

  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      <Navbar user={session} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-3 pb-4">
          <div>
            <h1 className="text-base font-semibold text-text-primary tracking-tight flex items-center gap-2">
              <span>Select your server</span>
              <span className="text-[10px] font-sans text-text-muted px-2 py-0.5 rounded bg-surface-3 border border-border">
                {userGuilds.length}
              </span>
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Select an authorized Discord server to configure Hawk features and settings.
            </p>
          </div>
        </div>

        {/* Server Cards Grid */}
        {userGuilds.length === 0 ? (
          <div className="text-center py-20 bg-panel border border-border rounded-lg mt-6 p-8">
            <Server className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <h3 className="text-sm font-medium text-text-primary">No authorized servers found</h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              You must have Manage Server permissions or be an authorized bot administrator to manage servers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6">
            {userGuilds.map(guild => <ServerCard key={guild.id} guild={guild} testServer={guild.id === testId}/>)}
          </div>
        )}
      </main>
    </div>
  );
}

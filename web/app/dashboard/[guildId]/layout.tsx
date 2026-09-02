import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { fetchUserGuilds } from '@/lib/discord';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

export default async function GuildDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/api/auth/login');

  const { guildId } = await params;
  const userGuilds = await fetchUserGuilds(session.accessToken);
  const targetGuild = userGuilds.find((g) => g.id === guildId);

  if (!targetGuild) {
    redirect('/dashboard');
  }

  const iconUrl = targetGuild.icon
    ? `https://cdn.discordapp.com/icons/${targetGuild.id}/${targetGuild.icon}.png?size=128`
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar user={session} />
      <div className="flex flex-1">
        <Sidebar guildId={guildId} guildName={targetGuild.name} guildIcon={iconUrl} />
        <main className="flex-1 p-6 md:p-10 max-w-5xl overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

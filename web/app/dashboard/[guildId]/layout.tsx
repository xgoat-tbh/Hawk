import React from 'react';
import { redirect } from 'next/navigation';
import { getSession, canManageGuild } from '@/lib/auth';
import { fetchBotGuilds } from '@/lib/discord';
import { GuildDashboardShell } from '@/components/GuildDashboardShell';

export default async function GuildDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/');

  const { guildId } = await params;

  // Enforce server-side authorization: user must have permissions on this guild
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    redirect('/dashboard');
  }

  const botGuilds = await fetchBotGuilds();
  const targetGuild = botGuilds.find((g) => g.id === guildId);

  if (!targetGuild) {
    redirect('/dashboard');
  }

  const iconUrl = targetGuild.icon
    ? `https://cdn.discordapp.com/icons/${targetGuild.id}/${targetGuild.icon}.png?size=128`
    : null;

  return (
    <GuildDashboardShell
      user={session}
      guildId={guildId}
      guildName={targetGuild.name}
      guildIcon={iconUrl}
    >
      {children}
    </GuildDashboardShell>
  );
}

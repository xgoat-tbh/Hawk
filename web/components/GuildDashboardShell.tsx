'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';

interface GuildDashboardShellProps {
  user: any;
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  children: React.ReactNode;
}

export function GuildDashboardShell({
  user,
  guildId,
  guildName,
  guildIcon,
  children,
}: GuildDashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      <Navbar
        user={user}
        guildName={guildName}
        onMobileMenuToggle={() => setMobileOpen((prev) => !prev)}
      />
      <div className="flex flex-1">
        <Sidebar
          guildId={guildId}
          guildName={guildName}
          guildIcon={guildIcon}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

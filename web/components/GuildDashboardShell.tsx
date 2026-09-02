'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { CommandPalette } from '@/components/Layout/CommandPalette';
import { GuildProvider } from '@/context/GuildContext';

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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <GuildProvider
      guildId={guildId}
      initialGuildName={guildName}
      initialGuildIcon={guildIcon}
    >
      <div className="h-screen overflow-hidden flex flex-col bg-[#050505]">
        <Navbar
          user={user}
          guildName={guildName}
          onMobileMenuToggle={() => setMobileOpen((prev) => !prev)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            guildId={guildId}
            guildName={guildName}
            guildIcon={guildIcon}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <main className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
            {children}
          </main>
        </div>

        <CommandPalette
          guildId={guildId}
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />
      </div>
    </GuildProvider>
  );
}

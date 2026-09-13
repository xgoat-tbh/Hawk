'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { CommandPalette } from '@/components/Layout/CommandPalette';
import { ServerSwitcherModal } from '@/components/Overview/ServerSwitcherModal';
import { GuildProvider } from '@/context/GuildContext';
import { ThemeProvider } from '@/context/ThemeContext';

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
  const pathname = usePathname();
  const isOverview = pathname === `/dashboard/${guildId}` || pathname === `/dashboard/${guildId}/`;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [serverSwitcherOpen, setServerSwitcherOpen] = useState(false);

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
    <ThemeProvider>
      <GuildProvider
        guildId={guildId}
        initialGuildName={guildName}
        initialGuildIcon={guildIcon}
      >
        <div className="h-screen w-screen overflow-hidden flex bg-[#f2f4f8] dark:bg-[#08090a] transition-colors duration-200">
          {/* Left Sidebar */}
          <Sidebar
            guildId={guildId}
            guildName={guildName}
            guildIcon={guildIcon}
            user={user}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
            onOpenServerSwitcher={() => setServerSwitcherOpen(true)}
          />

          {/* Right Main Content Area */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
            <Navbar
              user={user}
              guildName={guildName}
              onMobileMenuToggle={() => setMobileOpen((prev) => !prev)}
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            />

            <div
              className={`flex-1 ${
                isOverview
                  ? 'overflow-y-auto xl:overflow-hidden px-4 sm:px-6 lg:px-8 pt-1 pb-1'
                  : 'overflow-y-auto px-4 sm:px-6 lg:px-8 pb-12'
              }`}
            >
              <div className="max-w-[1400px] mx-auto w-full">
                {children}
              </div>
            </div>
          </div>

          <CommandPalette
            guildId={guildId}
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
          />

          <ServerSwitcherModal
            isOpen={serverSwitcherOpen}
            onClose={() => setServerSwitcherOpen(false)}
          />
        </div>
      </GuildProvider>
    </ThemeProvider>
  );
}

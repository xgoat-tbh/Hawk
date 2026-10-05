'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PageTransition } from '@/components/Layout/PageTransition';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { CommandPalette } from '@/components/Layout/CommandPalette';
import { ServerSwitcherModal } from '@/components/Overview/ServerSwitcherModal';
import { GuildProvider, useGuildData } from '@/context/GuildContext';

const SendMessageModal = dynamic(() => import('@/components/Overview/SendMessageModal').then(m => m.SendMessageModal), { ssr: false });
const AddRewardModal = dynamic(() => import('@/components/Overview/AddRewardModal').then(m => m.AddRewardModal), { ssr: false });
interface GuildDashboardShellProps {
  user: any;
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export function GuildDashboardShell({
  user,
  guildId,
  guildName,
  guildIcon,
  children,
  rightPanel,
}: GuildDashboardShellProps) {
  const pathname = usePathname();
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
    <GuildProvider
      key={guildId}
      guildId={guildId}
      initialGuildName={guildName}
      initialGuildIcon={guildIcon}
    >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] btn-primary">Skip to content</a>
      <div className="hawk-shell text-text-primary">
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
        <div className="relative flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <GuildNavbar user={user} guildName={guildName} onMobileMenuToggle={() => setMobileOpen(prev => !prev)} onOpenCommandPalette={() => setCommandPaletteOpen(true)}/>

          <main id="main-content" className="hawk-main flex-1" tabIndex={-1}>
            <GuildContent><PageTransition key={pathname}>{children}</PageTransition></GuildContent>
            {rightPanel && <aside>{rightPanel}</aside>}
          </main>
          <div id="save-dock" className="absolute bottom-4 inset-x-4 z-40 pointer-events-none"/>
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
  );
}

function GuildContent({ children }: { children: React.ReactNode }) {
  const { loading, error, refreshData, userPermissions } = useGuildData();
  const pathname = usePathname();
  const viewer = userPermissions && !Object.values(userPermissions.modules).some(p => p.manage);
  if (loading) return <div role="status" aria-label="Loading server configuration" className="space-y-6 max-w-5xl"><div className="h-8 w-64 bg-surface-3 rounded"/><div className="h-20 bg-surface-2 rounded"/><div className="h-64 bg-surface-2 rounded"/><span className="sr-only">Loading server configuration</span></div>;
  if (error) return <div role="alert" className="surface-container p-6 space-y-3"><h1>Unable to load server</h1><p className="text-text-secondary">{error}</p><button className="btn-secondary" onClick={refreshData}>Retry</button></div>;
  return <>{viewer && <div role="status" className="mb-5 text-sm text-text-secondary border-l-2 border-accent pl-3">View-only access. An allowlisted editor can change server settings.</div>}<fieldset disabled={Boolean(viewer && pathname.split('/').length > 3)} className="min-w-0">{children}</fieldset></>;
}

function GuildNavbar(props: React.ComponentProps<typeof Navbar>) {
  const { userPermissions, refreshData } = useGuildData();
  const editable = Boolean(userPermissions && Object.values(userPermissions.modules).some(p => p.manage));
  const [messageOpen, setMessageOpen] = useState(false); const [rewardOpen, setRewardOpen] = useState(false);
  return <><Navbar {...props} onSendMessage={editable ? () => setMessageOpen(true) : undefined} onAddReward={editable ? () => setRewardOpen(true) : undefined}/>
    {messageOpen && <SendMessageModal isOpen onClose={() => setMessageOpen(false)} onSuccess={refreshData}/>}{rewardOpen && <AddRewardModal isOpen onClose={() => setRewardOpen(false)} onSuccess={refreshData}/>}</>;
}

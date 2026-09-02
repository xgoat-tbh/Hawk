'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sliders,
  Coins,
  Radio,
  Gamepad2,
  Sparkles,
  MessageSquare,
  ChevronLeft,
  ShoppingBag,
  Briefcase,
  Pin,
  Image as ImageIcon,
  ShieldAlert,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ guildId, guildName, guildIcon, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const navGroups = [
    {
      group: 'Server Core',
      items: [
        { label: 'General Settings', href: `/dashboard/${guildId}/general`, icon: Sliders },
        { label: 'Permissions & Rules', href: `/dashboard/${guildId}/permissions`, icon: ShieldAlert },
      ],
    },
    {
      group: 'Economy & Rewards',
      items: [
        { label: 'Economy Config', href: `/dashboard/${guildId}/economy`, icon: Coins },
        { label: 'Role Income', href: `/dashboard/${guildId}/income`, icon: Briefcase },
        { label: 'Server Store', href: `/dashboard/${guildId}/store`, icon: ShoppingBag },
      ],
    },
    {
      group: 'Voice & Activity',
      items: [
        { label: 'Private Voice (PVC)', href: `/dashboard/${guildId}/pvc`, icon: Radio },
        { label: 'Gaming LFG', href: `/dashboard/${guildId}/gaming`, icon: Gamepad2 },
      ],
    },
    {
      group: 'Engagement',
      items: [
        { label: 'Welcome Embeds', href: `/dashboard/${guildId}/welcome`, icon: Sparkles },
        { label: 'Community Tools', href: `/dashboard/${guildId}/community`, icon: MessageSquare },
        { label: 'Sticky Messages', href: `/dashboard/${guildId}/sticky`, icon: Pin },
        { label: 'Media Channels', href: `/dashboard/${guildId}/media`, icon: ImageIcon },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#08080a] border-r border-white/[0.07]">
      {/* Guild Header */}
      <div className="p-3.5 border-b border-white/[0.07] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Back to Servers"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          {guildIcon ? (
            <img
              src={guildIcon}
              alt={guildName}
              className="w-8 h-8 rounded-lg border border-white/10 shrink-0 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 text-white/80 font-mono text-xs font-semibold flex items-center justify-center shrink-0">
              {guildName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-xs text-white truncate tracking-wide">{guildName}</span>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-mono font-medium tracking-widest uppercase text-white/30">
              {group.group}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium tracking-wide transition-all select-none duration-150',
                    isActive
                      ? 'bg-white/[0.08] border border-white/20 text-white shadow-sm'
                      : 'text-white/60 border border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/[0.06]'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-white/40')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-60 h-[calc(100vh-3.5rem)] sticky top-14 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
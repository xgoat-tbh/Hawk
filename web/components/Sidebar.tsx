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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
}

export function Sidebar({ guildId, guildName, guildIcon }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'General Settings', href: `/dashboard/${guildId}/general`, icon: Sliders },
    { label: 'Economy & Rewards', href: `/dashboard/${guildId}/economy`, icon: Coins },
    { label: 'Server Store', href: `/dashboard/${guildId}/store`, icon: ShoppingBag },
    { label: 'Private Voice (PVC)', href: `/dashboard/${guildId}/pvc`, icon: Radio },
    { label: 'Gaming LFG', href: `/dashboard/${guildId}/gaming`, icon: Gamepad2 },
    { label: 'Welcome Embeds', href: `/dashboard/${guildId}/welcome`, icon: Sparkles },
    { label: 'Community Tools', href: `/dashboard/${guildId}/community`, icon: MessageSquare },
  ];

  return (
    <aside className="w-64 border-r border-[#1b1f2b] bg-[#0a0c12]/70 backdrop-blur-md flex flex-col h-[calc(100vh-4rem)] sticky top-16">
      {/* Guild Header */}
      <div className="p-4 border-b border-[#1b1f2b] flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg bg-[#14171f] border border-[#232733] border-b-2 border-[#0e1017] text-muted hover:text-white hover:border-[#343a4c] transition-all active:translate-y-0.5"
          title="Back to Servers"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3 overflow-hidden">
          {guildIcon ? (
            <img src={guildIcon} alt={guildName} className="w-9 h-9 rounded-lg border border-[#232733] flex-shrink-0 object-cover shadow-sm" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/30 text-[#5865F2] font-bold text-xs flex items-center justify-center flex-shrink-0">
              {guildName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-sm text-white truncate tracking-wide">{guildName}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all select-none duration-150',
                isActive
                  ? 'bg-[#5865F2] text-white border-t border-white/20 border-b-4 border-[#3b44aa] shadow-[0_0_15px_rgba(88,101,242,0.3)]'
                  : 'bg-[#101218]/40 border border-[#1b1f2b] text-muted hover:text-white hover:border-[#2f364a] hover:bg-[#151821]'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-muted')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

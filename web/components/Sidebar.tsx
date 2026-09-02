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
    <aside className="w-64 border-r border-white/[0.06] bg-[#000000]/80 backdrop-blur-xl flex flex-col h-[calc(100vh-4rem)] sticky top-16">
      {/* Guild Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
          title="Back to Servers"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3 overflow-hidden">
          {guildIcon ? (
            <img src={guildIcon} alt={guildName} className="w-9 h-9 rounded-xl border border-white/10 shrink-0 object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/30 text-[#5865F2] font-bold text-xs flex items-center justify-center shrink-0">
              {guildName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-sm text-white truncate tracking-wide">{guildName}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all select-none duration-150',
                isActive
                  ? 'bg-[#5865F2]/20 border border-[#5865F2]/60 text-white'
                  : 'text-white/60 border border-transparent hover:text-white hover:bg-white/[0.04] hover:border-white/[0.08]'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-[#7289da]' : 'text-white/40')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


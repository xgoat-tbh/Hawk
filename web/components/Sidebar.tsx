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
    <aside className="w-64 border-r border-border bg-surface/50 flex flex-col h-[calc(100vh-4rem)] sticky top-16">
      {/* Guild Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-1.5 rounded-lg border border-border text-muted hover:text-white hover:bg-surfaceHover transition-colors"
          title="Back to Servers"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2.5 overflow-hidden">
          {guildIcon ? (
            <img src={guildIcon} alt={guildName} className="w-8 h-8 rounded-full border border-border flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center flex-shrink-0">
              {guildName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-sm text-white truncate">{guildName}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'text-muted hover:text-white hover:bg-surfaceHover'
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

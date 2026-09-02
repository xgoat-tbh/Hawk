'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sliders,
  Coins,
  Radio,
  Gamepad2,
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
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';

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
      group: 'Server',
      items: [
        { label: 'Overview', href: `/dashboard/${guildId}`, icon: Sliders },
        { label: 'General Settings', href: `/dashboard/${guildId}/general`, icon: Sliders },
        { label: 'Permissions & Rules', href: `/dashboard/${guildId}/permissions`, icon: ShieldAlert },
      ],
    },
    {
      group: 'Economy',
      items: [
        { label: 'Economy & Rewards', href: `/dashboard/${guildId}/economy`, icon: Coins },
        { label: 'Role Salaries', href: `/dashboard/${guildId}/income`, icon: Briefcase },
        { label: 'Store Catalog', href: `/dashboard/${guildId}/store`, icon: ShoppingBag },
      ],
    },
    {
      group: 'Voice',
      items: [
        { label: 'Private Voice (PVC)', href: `/dashboard/${guildId}/pvc`, icon: Radio },
        { label: 'Gaming LFG', href: `/dashboard/${guildId}/gaming`, icon: Gamepad2 },
      ],
    },
    {
      group: 'Community',
      items: [
        { label: 'Community Tools', href: `/dashboard/${guildId}/community`, icon: MessageSquare },
        { label: 'Media Channels', href: `/dashboard/${guildId}/media`, icon: ImageIcon },
        { label: 'Sticky Notices', href: `/dashboard/${guildId}/sticky`, icon: Pin },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#08090a] border-r border-[#1c1f23]">
      {/* Guild Header */}
      <div className="p-3.5 border-b border-[#1c1f23] flex items-center justify-between gap-2 bg-[#08090a]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-md bg-[#121417] border border-[#24272b] text-[#7e8389] hover:text-[#f1f2f3] hover:bg-[#17191c] transition-colors"
            title="Back to Servers"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          {guildIcon ? (
            <img
              src={guildIcon}
              alt={guildName}
              className="w-8 h-8 rounded-md border border-[#24272b] shrink-0 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-[#121417] border border-[#24272b] text-[#d5d7da] font-mono text-xs font-semibold flex items-center justify-center shrink-0">
              {guildName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-xs text-[#f1f2f3] truncate tracking-wide">{guildName}</span>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-md text-[#7e8389] hover:text-[#f1f2f3] hover:bg-[#121417]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Links with HawkScrollArea */}
      <HawkScrollArea className="flex-1 p-2.5 space-y-4">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-mono font-medium tracking-widest uppercase text-[#7e8389]">
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
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium tracking-wide transition-all select-none duration-150',
                    isActive
                      ? 'bg-[#17191c] border border-[#2b2f34] text-[#f1f2f3] shadow-sm font-semibold'
                      : 'text-[#a9adb2] border border-transparent hover:text-[#f1f2f3] hover:bg-[#121417]'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-[#f1f2f3]' : 'text-[#7e8389]')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </HawkScrollArea>
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
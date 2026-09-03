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
  ShieldCheck,
  FileText,
  Activity,
  HeartHandshake,
  X,
} from 'lucide-react';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';

interface SidebarProps {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  guildId,
  guildName,
  guildIcon,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const navGroups = [
    {
      group: 'SERVER',
      items: [
        { label: 'Overview', href: `/dashboard/${guildId}`, icon: Sliders },
        { label: 'General Settings', href: `/dashboard/${guildId}/general`, icon: Sliders },
        { label: 'Permissions & Rules', href: `/dashboard/${guildId}/permissions`, icon: ShieldCheck },
      ],
    },
    {
      group: 'ECONOMY',
      items: [
        { label: 'Economy & Rewards', href: `/dashboard/${guildId}/economy`, icon: Coins },
        { label: 'Role Salaries', href: `/dashboard/${guildId}/income`, icon: Briefcase },
        { label: 'Store Catalog', href: `/dashboard/${guildId}/store`, icon: ShoppingBag },
      ],
    },
    {
      group: 'VOICE',
      items: [
        { label: 'Private Voice (PVC)', href: `/dashboard/${guildId}/pvc`, icon: Radio },
        { label: 'Gaming LFG', href: `/dashboard/${guildId}/gaming`, icon: Gamepad2 },
      ],
    },
    {
      group: 'COMMUNITY',
      items: [
        { label: 'Welcome Greetings', href: `/dashboard/${guildId}/welcome`, icon: HeartHandshake },
        { label: 'Community Tools', href: `/dashboard/${guildId}/community`, icon: MessageSquare },
        { label: 'Media Channels', href: `/dashboard/${guildId}/media`, icon: ImageIcon },
        { label: 'Sticky Notices', href: `/dashboard/${guildId}/sticky`, icon: Pin },
      ],
    },
    {
      group: 'INSIGHTS & SYSTEM',
      items: [
        { label: 'Audit Log', href: `/dashboard/${guildId}/permissions?tab=audit`, icon: FileText },
        { label: 'Access Simulator', href: `/dashboard/${guildId}/permissions?tab=simulator`, icon: Activity },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#08090a] border-r border-[#17191c]">
      {/* Guild Header */}
      <div className="p-3 border-b border-[#17191c] flex items-center justify-between gap-2 bg-[#08090a]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Link
            href="/dashboard"
            className="p-1 rounded bg-[#121417] border border-[#1f2226] text-[#6e747c] hover:text-[#ededed] hover:bg-[#17191c] transition-colors shrink-0"
            title="Switch Server"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>

          <div className="w-6 h-6 rounded bg-[#121417] border border-[#1f2226] flex items-center justify-center overflow-hidden shrink-0">
            {guildIcon ? (
              <img src={guildIcon} alt={guildName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-mono font-bold text-[#ededed]">
                {guildName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <span className="text-xs font-medium text-[#ededed] truncate max-w-[130px]" title={guildName}>
            {guildName}
          </span>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 rounded text-[#6e747c] hover:text-[#ededed]"
            title="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation List - Independently Scrollable */}
      <HawkScrollArea className="flex-1 px-2.5 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-0.5">
            <div className="px-2 py-1 text-[9px] font-mono font-semibold uppercase tracking-wider text-[#6e747c]">
              {group.group}
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isExact = pathname === item.href;
                const isNested = item.href.includes('?') 
                  ? false 
                  : item.href !== `/dashboard/${guildId}` && pathname.startsWith(item.href);
                const isActive = isExact || isNested;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors select-none ${
                      isActive
                        ? 'bg-[#121417] text-[#ededed] border-l-2 border-l-success'
                        : 'text-[#949aa2] hover:text-[#ededed] hover:bg-[#0d0e10]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-success' : 'text-[#6e747c]'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </HawkScrollArea>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed width, independent scroll) */}
      <aside className="hidden md:block w-56 shrink-0 h-[calc(100vh-3.5rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
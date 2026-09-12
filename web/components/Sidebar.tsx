'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sliders,
  Coins,
  Radio,
  Gamepad2,
  MessageSquare,
  ChevronLeft,
  ChevronDown,
  ShoppingBag,
  Briefcase,
  Pin,
  ShieldCheck,
  FileText,
  Activity,
  HeartHandshake,
  Terminal,
  X,
  Dice5,
} from 'lucide-react';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { useGuildData } from '@/context/GuildContext';

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
  const { userPermissions } = useGuildData();

  // Accordion state per category group
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const isModuleAllowed = (moduleId?: string) => {
    if (!moduleId) return true;
    if (!userPermissions) return true;
    if (userPermissions.isOwner || userPermissions.isAdmin) return true;
    const perm = userPermissions.modules[moduleId];
    return perm ? perm.view : false;
  };

  const navGroups = [
    {
      group: 'SERVER CONFIG',
      badge: 'Core',
      items: [
        { label: 'Overview', href: `/dashboard/${guildId}`, icon: Sliders },
        { label: 'General Settings', href: `/dashboard/${guildId}/general`, icon: Sliders, module: 'general' },
        { label: 'Permissions & Rules', href: `/dashboard/${guildId}/permissions`, icon: ShieldCheck, module: 'permissions' },
      ].filter((item) => isModuleAllowed(item.module)),
    },
    {
      group: 'ECONOMY & COMMERCE',
      badge: 'Active',
      items: [
        { label: 'Economy & Rewards', href: `/dashboard/${guildId}/economy`, icon: Coins, module: 'economy' },
        { label: 'Store Catalog', href: `/dashboard/${guildId}/store`, icon: ShoppingBag, module: 'economy' },
        { label: 'Role Salaries', href: `/dashboard/${guildId}/income`, icon: Briefcase, module: 'economy' },
        { label: 'Minigames & Cooldowns', href: `/dashboard/${guildId}/games`, icon: Dice5, module: 'economy' },
      ].filter((item) => isModuleAllowed(item.module)),
    },
    {
      group: 'VOICE & GAMING',
      badge: 'Live',
      items: [
        { label: 'Private Voice (PVC)', href: `/dashboard/${guildId}/pvc`, icon: Radio, module: 'pvc' },
        { label: 'Gaming LFG', href: `/dashboard/${guildId}/gaming`, icon: Gamepad2, module: 'gaming' },
      ].filter((item) => isModuleAllowed(item.module)),
    },
    {
      group: 'COMMUNITY & CHAT',
      items: [
        { label: 'Welcome Greetings', href: `/dashboard/${guildId}/welcome`, icon: HeartHandshake },
        { label: 'Community Tools', href: `/dashboard/${guildId}/community`, icon: MessageSquare, module: 'community' },
        { label: 'Sticky Notices', href: `/dashboard/${guildId}/sticky`, icon: Pin, module: 'sticky' },
      ].filter((item) => isModuleAllowed(item.module)),
    },
    {
      group: 'DEVELOPER & SYSTEM',
      items: [
        { label: 'Developers & Permits', href: `/dashboard/${guildId}/developers`, icon: Terminal },
        { label: 'Audit Log', href: `/dashboard/${guildId}/permissions?tab=audit`, icon: FileText, module: 'permissions' },
        { label: 'Access Simulator', href: `/dashboard/${guildId}/permissions?tab=preview`, icon: Activity, module: 'permissions' },
      ].filter((item) => isModuleAllowed(item.module)),
    },
  ].filter((g) => g.items.length > 0);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#08090a] border-r border-[#17191c]">
      {/* Guild Header / Switcher */}
      <div className="p-3 border-b border-[#17191c] flex items-center justify-between gap-2 bg-[#08090a]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Link
            href="/dashboard"
            className="p-1.5 rounded-lg bg-[#121417] border border-[#1f2226] text-[#6e747c] hover:text-[#ededed] hover:bg-[#17191c] transition-colors shrink-0"
            title="Switch Server"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>

          <div className="w-7 h-7 rounded-lg bg-[#121417] border border-[#1f2226] flex items-center justify-center overflow-hidden shrink-0">
            {guildIcon ? (
              <img src={guildIcon} alt={guildName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-mono font-bold text-[#ededed]">
                {guildName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-[#f0f2f5] truncate max-w-[125px]" title={guildName}>
              {guildName}
            </span>
            <span className="text-[10px] text-[#6e747c] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
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

      {/* Navigation List - Accordion Groups */}
      <HawkScrollArea className="flex-1 px-2.5 py-3 space-y-3">
        {navGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.group] === true;

          return (
            <div key={group.group} className="space-y-1">
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.group)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider text-[#6e747c] hover:text-[#c1c7cd] hover:bg-[#0f1114] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>{group.group}</span>
                  {group.badge && (
                    <span className="px-1.5 py-0.2 text-[8px] font-sans font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 lowercase">
                      {group.badge}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-3 h-3 text-[#555b64] transition-transform duration-200 ${
                    isCollapsed ? '-rotate-90' : 'rotate-0'
                  }`}
                />
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="space-y-0.5 animate-in fade-in duration-150">
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
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 select-none ${
                          isActive
                            ? 'bg-[#14171c] text-[#f0f2f5] border-l-2 border-indigo-500 shadow-sm'
                            : 'text-[#8c949e] hover:text-[#f0f2f5] hover:bg-[#0e1013]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-indigo-400' : 'text-[#6e747c]'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </HawkScrollArea>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-60 shrink-0 h-[calc(100vh-3.5rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div onClick={onCloseMobile} className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-64 max-w-[80vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
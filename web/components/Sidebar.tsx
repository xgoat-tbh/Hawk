'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutGrid,
  Coins,
  Users,
  Radio,
  Gamepad2,
  ShoppingBag,
  BarChart3,
  Settings,
  MoreVertical,
  ChevronRight,
  X,
} from 'lucide-react';
import { useGuildData } from '@/context/GuildContext';

interface SidebarProps {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenServerSwitcher?: () => void;
}

export function Sidebar({
  guildId,
  guildName,
  guildIcon,
  mobileOpen,
  onCloseMobile,
  onOpenServerSwitcher,
}: SidebarProps) {
  const pathname = usePathname();
  const { bot } = useGuildData();

  const navItems = [
    { label: 'Overview', href: `/dashboard/${guildId}`, icon: Home },
    { label: 'Modules', href: `/dashboard/${guildId}#modules`, icon: LayoutGrid, isAnchor: true },
    { label: 'Economy', href: `/dashboard/${guildId}/economy`, icon: Coins },
    { label: 'Community', href: `/dashboard/${guildId}/community`, icon: Users },
    { label: 'Voice', href: `/dashboard/${guildId}/pvc`, icon: Radio },
    { label: 'Gaming', href: `/dashboard/${guildId}/gaming`, icon: Gamepad2 },
    { label: 'Store', href: `/dashboard/${guildId}/store`, icon: ShoppingBag },
    { label: 'Analytics', href: `/dashboard/${guildId}/permissions?tab=audit`, icon: BarChart3 },
    { label: 'Settings', href: `/dashboard/${guildId}/general`, icon: Settings },
  ];

  const handleNavClick = (e: React.MouseEvent, item: any) => {
    if (item.isAnchor && pathname === `/dashboard/${guildId}`) {
      e.preventDefault();
      const el = document.getElementById('modules-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
    onCloseMobile?.();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#fbfbfc]/80 dark:bg-[#0c0d10] border-r border-black/[0.06] dark:border-white/[0.06] select-none p-4">
      {/* 1. Header with Amo Bot Logo */}
      <div className="flex items-center justify-between pb-6 pt-2 px-1">
        <Link href={`/dashboard/${guildId}`} className="flex items-center gap-3 group">
          {/* Logo Badge */}
          <div className="w-10 h-10 rounded-2xl bg-[#14171f] dark:bg-white text-white dark:text-black flex items-center justify-center shadow-md shadow-black/10 transition-transform group-hover:scale-[1.02]">
            <svg
              className="w-5 h-5 fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M21.707 2.293a1 1 0 0 0-1.069-.225l-18 7a1 1 0 0 0-.145 1.787l6.786 3.393 3.393 6.786a1 1 0 0 0 1.787-.145l7-18a1 1 0 0 0-.225-1.069l-7.527 7.527 1.414 1.414 7.381-7.472z" />
            </svg>
          </div>

          <div className="space-y-0.5">
            <h1 className="text-sm font-bold tracking-tight text-[#101217] dark:text-white">
              {bot?.username ? `${bot.username} Bot` : 'Amo Bot'}
            </h1>
            <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
              Built for communities.
            </p>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-[#64748b] hover:text-[#101217] dark:text-[#94a3b8] dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Navigation List */}
      <nav className="flex-1 space-y-1 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isExact = pathname === item.href;
          const isNested = !item.isAnchor && item.href !== `/dashboard/${guildId}` && pathname.startsWith(item.href);
          const isActive = isExact || isNested;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs transition-all duration-150 ${
                isActive
                  ? 'bg-white dark:bg-[#181b21] text-[#101217] dark:text-white font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-black/[0.04] dark:border-white/[0.08]'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#101217] dark:hover:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.02] font-medium'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive
                    ? 'text-[#101217] dark:text-white'
                    : 'text-[#8c949e] dark:text-[#64748b]'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 3. Bottom Section: Connected Server + User Card + Quote */}
      <div className="pt-4 space-y-3 border-t border-black/[0.05] dark:border-white/[0.06]">
        {/* Connected Server Card */}
        <button
          type="button"
          onClick={onOpenServerSwitcher}
          className="w-full p-2.5 rounded-2xl bg-white/90 dark:bg-[#131519] border border-black/[0.05] dark:border-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.15] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all group text-left"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#14171f] dark:bg-white text-white dark:text-black font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
              {guildIcon ? (
                <img src={guildIcon} alt={guildName} className="w-full h-full object-cover rounded-xl" />
              ) : (
                'AMO'
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#101217] dark:text-[#ededed] truncate">
                {guildName}
              </div>
              <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Connected</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#101217] dark:group-hover:text-white transition-colors shrink-0" />
        </button>

        {/* User Card */}
        <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-[#131519]/70 border border-black/[0.04] dark:border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              A
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#101217] dark:text-[#ededed] truncate">
                Aaryan
              </div>
              <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                Owner
              </div>
            </div>
          </div>
          <button
            type="button"
            className="p-1 text-[#94a3b8] hover:text-[#101217] dark:hover:text-white"
            title="Account settings"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quote Footer */}
        <div className="px-2 pt-1">
          <p className="text-[10px] italic text-[#94a3b8] leading-tight">
            &ldquo;Better communities, one server at a time.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div onClick={onCloseMobile} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-64 max-w-[80vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
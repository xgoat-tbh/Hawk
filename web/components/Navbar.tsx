'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, LogOut, LayoutDashboard, Menu, Search } from 'lucide-react';

interface NavbarProps {
  user?: {
    username: string;
    avatar: string | null;
    id: string;
  } | null;
  onMobileMenuToggle?: () => void;
  onOpenCommandPalette?: () => void;
  guildName?: string;
  botStatus?: 'operational' | 'warning' | 'degraded';
}

export function Navbar({
  user,
  onMobileMenuToggle,
  onOpenCommandPalette,
  guildName,
  botStatus: _botStatus = 'operational',
}: NavbarProps) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <header className="h-14 border-b border-[#1c1f23] bg-[#08090a]/95 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3 md:gap-4">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-1.5 rounded-md text-[#7e8389] hover:text-[#f1f2f3] hover:bg-[#17191c] transition-colors"
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-md bg-[#121417] border border-[#24272b] flex items-center justify-center text-[#f1f2f3] group-hover:border-[#373b42] group-hover:bg-[#17191c] shadow-clay-button transition-all duration-150">
            <Shield className="w-4 h-4 text-[#d5d7da]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs tracking-wider uppercase text-[#f1f2f3]">
              Hawk
            </span>
            <span className="text-[10px] font-mono text-[#7e8389] uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-[#121417] border border-[#24272b]">
              Ops
            </span>
          </div>
        </Link>

        {guildName && (
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#1c1f23] text-xs">
            <span className="text-[#373b42]">/</span>
            <span className="text-[#d5d7da] font-medium truncate max-w-[180px]">{guildName}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse ml-1" title="Bot Connected" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#0d0e10] border border-[#24272b] hover:border-[#373b42] hover:bg-[#121417] text-[#7e8389] hover:text-[#f1f2f3] text-xs shadow-clay-input transition-colors"
            title="Open Command Palette (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px] font-sans">Quick Search...</span>
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#17191c] border border-[#24272b] text-[#7e8389] ml-1">
              ⌘K
            </kbd>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="btn-outline-secondary text-[11px] py-1.5 px-3 hidden sm:flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#a9adb2]" />
              <span>Servers</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[#1c1f23]">
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-7 h-7 rounded-full border border-[#24272b] object-cover"
              />
              <span className="text-xs font-medium text-[#f1f2f3] hidden md:inline">{user.username}</span>
              <a
                href="/api/auth/logout"
                title="Log Out"
                className="p-1.5 rounded-md text-[#7e8389] hover:text-critical-text hover:bg-critical-soft transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

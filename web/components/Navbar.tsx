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
    <header className="h-12 border-b border-[#17191c] bg-[#08090a]/95 backdrop-blur-md sticky top-0 z-40 px-3 md:px-5 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-2.5 md:gap-3.5">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="md:hidden p-1 rounded text-[#6e747c] hover:text-[#ededed] hover:bg-[#121417] transition-colors"
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded bg-[#121417] border border-[#1f2226] flex items-center justify-center text-[#ededed] group-hover:border-[#2a2d33] group-hover:bg-[#17191c] shadow-tactile-btn transition-colors">
            <Shield className="w-3.5 h-3.5 text-[#c8ccd0]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs tracking-tight text-[#ededed]">
              HAWK
            </span>
            <span className="text-[9px] font-mono text-[#6e747c] uppercase tracking-wider px-1 py-0.2 rounded bg-[#121417] border border-[#1f2226]">
              OPS
            </span>
          </div>
        </Link>

        {guildName && (
          <div className="hidden sm:flex items-center gap-1.5 pl-2.5 border-l border-[#17191c] text-xs">
            <span className="text-[#3d424a]">/</span>
            <span className="text-[#c8ccd0] font-medium truncate max-w-[160px]">{guildName}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-success ml-1 shrink-0" title="Operational" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d0e10] border border-[#1f2226] hover:border-[#2a2d33] hover:bg-[#121417] text-[#6e747c] hover:text-[#ededed] text-xs shadow-tactile-input transition-colors"
            title="Search settings, roles, channels (Ctrl+K)"
          >
            <Search className="w-3 h-3 text-[#6e747c]" />
            <span className="text-[11px] font-sans">Search console...</span>
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#17191c] border border-[#1f2226] text-[#6e747c] ml-1">
              ⌘K
            </kbd>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="btn-outline-secondary text-[11px] py-1 px-2.5 hidden sm:flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3 h-3 text-[#949aa2]" />
              <span>Servers</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-[#17191c]">
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-6 h-6 rounded-full border border-[#1f2226] object-cover"
              />
              <span className="text-xs font-medium text-[#ededed] hidden md:inline">{user.username}</span>
              <a
                href="/api/auth/logout"
                title="Log Out"
                className="p-1 rounded text-[#6e747c] hover:text-critical-text hover:bg-critical-soft transition-colors"
              >
                <LogOut className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

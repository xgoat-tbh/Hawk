'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, LogOut, LayoutDashboard, Menu } from 'lucide-react';

interface NavbarProps {
  user?: {
    username: string;
    avatar: string | null;
    id: string;
  } | null;
  onMobileMenuToggle?: () => void;
  guildName?: string;
}

export function Navbar({ user, onMobileMenuToggle, guildName }: NavbarProps) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <header className="h-14 border-b border-white/[0.07] bg-[#070709]/85 backdrop-blur-xl sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 md:gap-4">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/90 group-hover:border-white/30 group-hover:bg-white/[0.08] transition-all duration-150">
            <Shield className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs tracking-wider uppercase text-white">
              Hawk
            </span>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
              Dashboard
            </span>
          </div>
        </Link>

        {guildName && (
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/[0.08] text-xs">
            <span className="text-white/30">/</span>
            <span className="text-white/80 font-medium truncate max-w-[180px]">{guildName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="btn-outline-secondary text-[11px] py-1.5 px-3 hidden sm:flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-white/60" />
              <span>Servers</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-white/[0.08]">
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-7 h-7 rounded-full border border-white/10 object-cover"
              />
              <span className="text-xs font-medium text-white/90 hidden md:inline">{user.username}</span>
              <a
                href="/api/auth/logout"
                title="Log Out"
                className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors ml-1"
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

'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, LogOut, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  user?: {
    username: string;
    avatar: string | null;
    id: string;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  return (
    <header className="h-16 border-b border-white/[0.06] bg-[#08090c]/80 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#5865F2] group-hover:border-[#5865F2]/40 transition-all duration-200">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-wide text-white">
            Hawk <span className="text-white/40 font-normal text-xs ml-1">Panel</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="btn-outline-secondary flex items-center gap-2"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Servers</span>
            </Link>

            <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.08]">
              <img src={avatarUrl} alt={user.username} className="w-8 h-8 rounded-full border border-white/10" />
              <span className="text-xs font-medium text-white/90 hidden md:inline">{user.username}</span>
              <a
                href="/api/auth/logout"
                title="Log Out"
                className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
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

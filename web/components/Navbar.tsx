'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ExternalLink, LogOut, LayoutDashboard, Sparkles } from 'lucide-react';

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
    <header className="h-16 border-b border-[#1b1f2b] bg-[#090b10]/90 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-[#5865F2] border-t border-white/25 border-b-2 border-[#3b44aa] flex items-center justify-center shadow-[0_0_20px_rgba(88,101,242,0.4)] group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(88,101,242,0.6)] transition-all duration-200">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-wider uppercase text-white flex items-center gap-2">
              Hawk <span className="text-[10px] px-2 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] font-bold border border-[#5865F2]/30 tracking-widest">SaaS</span>
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="https://discord.com/oauth2/authorize?client_id=1533448303944007800&permissions=8&scope=bot%20applications.commands"
          target="_blank"
          rel="noreferrer"
          className="btn-box-secondary hidden sm:inline-flex gap-2"
        >
          <span>Invite Hawk</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted" />
        </a>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="btn-box-secondary flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-[#5865F2]" />
              <span>Servers</span>
            </Link>
            <div className="flex items-center gap-2.5 pl-3 border-l border-[#1b1f2b]">
              <img src={avatarUrl} alt={user.username} className="w-9 h-9 rounded-lg border border-[#232733] shadow-md" />
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-bold text-white tracking-wide">{user.username}</span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                </span>
              </div>
              <a
                href="/api/auth/logout"
                title="Log Out"
                className="p-2 rounded-lg bg-[#14171f] border border-[#232733] text-muted hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <a
            href="/api/auth/login"
            className="btn-box-primary flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Login with Discord</span>
          </a>
        )}
      </div>
    </header>
  );
}

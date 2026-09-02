'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ExternalLink, LogOut, LayoutDashboard } from 'lucide-react';

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
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
            Hawk <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold border border-accent/30">Dashboard</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="https://discord.com/oauth2/authorize?client_id=1345431607519121469&permissions=8&scope=bot%20applications.commands"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted hover:text-white px-3 py-1.5 rounded-lg border border-border hover:border-muted/40 transition-colors"
        >
          <span>Invite Bot</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white px-3 py-1.5 rounded-lg hover:bg-surfaceHover transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-accent" />
              <span>Servers</span>
            </Link>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <img src={avatarUrl} alt={user.username} className="w-8 h-8 rounded-full border border-border" />
              <span className="text-sm font-semibold text-white hidden md:inline">{user.username}</span>
              <a
                href="/api/auth/logout"
                title="Log Out"
                className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <a
            href="/api/auth/login"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20 transition-all hover:shadow-accent/40"
          >
            <span>Login with Discord</span>
          </a>
        )}
      </div>
    </header>
  );
}

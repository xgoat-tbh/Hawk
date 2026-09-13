'use client';

import React, { useState, useEffect } from 'react';
import { Search, Sun, Bell, Menu } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

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
  guildName = 'Amo India',
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState('MON, SEP 13');
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    setDateStr(`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`);

    const hr = now.getHours();
    if (hr < 12) setGreeting('Good morning');
    else if (hr < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const displayName = user?.username || 'Aaryan';

  return (
    <header className="px-6 sm:px-8 pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none shrink-0">
      {/* Left: Date + Greeting + Subtitle */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-3">
          {onMobileMenuToggle && (
            <button
              type="button"
              onClick={onMobileMenuToggle}
              className="lg:hidden p-1.5 rounded-xl bg-white dark:bg-[#14161b] border border-black/[0.06] dark:border-white/[0.06] text-[#64748b] hover:text-[#101217] transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-[#94a3b8]">
            {dateStr}
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#101217] dark:text-white flex items-center gap-2">
          <span>{greeting},</span>
          <span className="font-extrabold text-[#101217] dark:text-white">{displayName}</span>
          <span className="text-xl">👋</span>
        </h1>

        <p className="text-xs font-medium text-[#64748b] dark:text-[#94a3b8]">
          {guildName} is running smoothly.
        </p>
      </div>

      {/* Right: Search + Action Icons + SIMPLE POWERFUL YOURS */}
      <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Search Pill */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 dark:bg-[#14161b] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-[#94a3b8] hover:text-[#101217] dark:hover:text-white hover:border-black/[0.12] dark:hover:border-white/[0.15] transition-all w-60 sm:w-72"
          >
            <Search className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span className="text-xs font-medium text-[#64748b] dark:text-[#94a3b8] truncate flex-1 text-left">
              Search servers, modules, settings...
            </span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#f1f5f9] dark:bg-[#1e222a] border border-black/[0.06] dark:border-white/[0.06] text-[#64748b] dark:text-[#94a3b8]">
              Ctrl K
            </kbd>
          </button>

          {/* Sun / Moon Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full bg-white/90 dark:bg-[#14161b] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] hover:text-[#101217] dark:hover:text-white transition-all hover:scale-105 active:scale-95"
            title="Toggle light/dark theme"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Sun className="w-4 h-4 text-[#64748b]" />
            )}
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            className="relative w-9 h-9 rounded-full bg-white/90 dark:bg-[#14161b] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center text-[#64748b] dark:text-[#94a3b8] hover:text-[#101217] dark:hover:text-white transition-all hover:scale-105 active:scale-95"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </button>
        </div>

        {/* Small slogan */}
        <div className="hidden md:block pr-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#94a3b8]/70">
            SIMPLE • POWERFUL • YOURS
          </span>
        </div>
      </div>
    </header>
  );
}

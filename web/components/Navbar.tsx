'use client';
import React from 'react';
import { Menu, Search, LogOut, Sun, Moon, Send, Gift } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { apiFetch } from '@/lib/api';
interface NavbarProps {
  user?: { username: string; avatar: string | null; id: string; global_name?: string } | null;
  onMobileMenuToggle?: () => void; onOpenCommandPalette?: () => void; guildName?: string;
  onSendMessage?: () => void; onAddReward?: () => void;
  botStatus?: 'operational' | 'warning' | 'degraded';
}
export function Navbar({ user, onMobileMenuToggle, onOpenCommandPalette, guildName, onSendMessage, onAddReward }: NavbarProps) {
  const { resolvedTheme, toggleTheme, setTheme } = useTheme();
  const displayName = user?.global_name || user?.username || 'Account';
  return <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-8 border-b border-border bg-background/90">
    <div className="flex items-center gap-3 min-w-0">
      {onMobileMenuToggle && <button className="btn-ghost lg:hidden" onClick={onMobileMenuToggle} aria-label="Open navigation"><Menu size={18}/></button>}
      <span className="text-text-muted text-xs hidden sm:inline">Workspace</span><span className="text-text-muted hidden sm:inline">/</span><span className="text-sm truncate max-w-[140px] sm:max-w-xs">{guildName || 'Hawk'}</span>
    </div>
    <button onClick={onOpenCommandPalette} className="flex items-center gap-2 min-h-9 px-3 rounded-md bg-surface-2 text-text-secondary text-xs sm:w-72" aria-label="Search pages and server resources">
      <Search size={15}/><span className="hidden sm:inline flex-1 text-left">Search workspace…</span><kbd className="hidden sm:inline text-[10px] text-text-muted">Ctrl / ⌘ K</kbd>
    </button>
    <div className="flex items-center gap-3">
      {onSendMessage && <button className="btn-ghost" onClick={onSendMessage} aria-label="Send message"><Send size={16}/></button>}{onAddReward && <button className="btn-ghost" onClick={onAddReward} aria-label="Grant reward"><Gift size={16}/></button>}
      <button onClick={toggleTheme} className="btn-ghost" aria-label="Toggle theme">{resolvedTheme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}</button><button className="btn-ghost hidden sm:inline-flex" onClick={() => setTheme('system')} aria-label="Use system theme">Auto</button>
      {user?.avatar ? <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`} alt="" className="w-8 h-8 rounded-full"/> : <span className="w-8 h-8 rounded-full bg-surface-4 flex items-center justify-center text-xs" aria-hidden="true">{displayName[0]}</span>}
      <span className="hidden xl:inline text-xs text-text-secondary">{displayName}</span>
      {user && <button onClick={async () => { const response = await apiFetch('/api/auth/logout', { method: 'POST' }); if (response.ok) window.location.assign('/'); }} className="btn-ghost px-1" aria-label={`Sign out ${displayName}`} title="Sign out"><LogOut size={16}/></button>}
    </div>
  </header>;
}

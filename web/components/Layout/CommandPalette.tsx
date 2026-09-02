'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Command, Sliders, Sparkles, Coins, Radio, ShoppingBag, Gamepad2, Briefcase, MessageSquare, Image, Pin, Lock, ArrowRight } from 'lucide-react';
import { BOT_COMMAND_CATALOG } from '@/lib/commands';

interface CommandPaletteProps {
  guildId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  label: string;
  subLabel?: string;
  path: string;
  icon: any;
  category: string;
}

export function CommandPalette({ guildId, isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigationItems: PaletteItem[] = [
    { label: 'Server Overview', path: `/dashboard/${guildId}`, icon: Sliders, category: 'Navigation' },
    { label: 'General Settings', path: `/dashboard/${guildId}/general`, icon: Sliders, category: 'Navigation' },
    { label: 'Permissions & Rules', path: `/dashboard/${guildId}/permissions`, icon: Lock, category: 'Navigation' },
    { label: 'Welcome & Embed Designer', path: `/dashboard/${guildId}/welcome`, icon: Sparkles, category: 'Navigation' },
    { label: 'Economy & Rewards', path: `/dashboard/${guildId}/economy`, icon: Coins, category: 'Navigation' },
    { label: 'Private Voice Channels', path: `/dashboard/${guildId}/pvc`, icon: Radio, category: 'Navigation' },
    { label: 'Store Catalog', path: `/dashboard/${guildId}/store`, icon: ShoppingBag, category: 'Navigation' },
    { label: 'Gaming LFG Alerts', path: `/dashboard/${guildId}/gaming`, icon: Gamepad2, category: 'Navigation' },
    { label: 'Role Income', path: `/dashboard/${guildId}/income`, icon: Briefcase, category: 'Navigation' },
    { label: 'Community Tools', path: `/dashboard/${guildId}/community`, icon: MessageSquare, category: 'Navigation' },
    { label: 'Media Channels', path: `/dashboard/${guildId}/media`, icon: Image, category: 'Navigation' },
    { label: 'Sticky Notices', path: `/dashboard/${guildId}/sticky`, icon: Pin, category: 'Navigation' },
  ];

  const commandItems: PaletteItem[] = BOT_COMMAND_CATALOG.map((cmd) => ({
    label: `!${cmd.name} — ${cmd.description}`,
    subLabel: `Usage: ${cmd.usage} [${cmd.dangerLevel}]`,
    path: `/dashboard/${guildId}/permissions?tab=commands`,
    icon: Command,
    category: 'Bot Commands',
  }));

  const allItems: PaletteItem[] = [...navigationItems, ...commandItems];

  const filtered = query.trim()
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          (item.subLabel && item.subLabel.toLowerCase().includes(query.toLowerCase())) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems.slice(0, 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          router.push(selected.path);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      />

      {/* Palette Container */}
      <div className="relative z-10 w-full max-w-xl bg-[#0a0a0c] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/[0.08] flex items-center gap-3 bg-[#08080a]">
          <Search className="w-4 h-4 text-white/50 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, page, or search setting..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-white/40">
            ESC
          </kbd>
        </div>

        {/* Results List (Internal Scroll Container) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-white/30">
              No matching commands or navigation pages found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={`${item.label}-${idx}`}
                  onClick={() => {
                    router.push(item.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/[0.06] text-white' : 'text-white/70 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-white/70" />
                    </div>
                    <div className="overflow-hidden space-y-0.5">
                      <div className="text-xs font-medium text-white truncate">{item.label}</div>
                      {item.subLabel && (
                        <div className="text-[10px] font-mono text-white/40 truncate">{item.subLabel}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.04] text-white/40 border border-white/[0.06]">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Palette Footer */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] bg-[#070709] flex items-center justify-between text-[11px] font-mono text-white/30">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Hawk Control Palette</span>
        </div>
      </div>
    </div>
  );
}

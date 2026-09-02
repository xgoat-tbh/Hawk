'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Command, Sliders, Coins, Radio, ShoppingBag, Gamepad2, Briefcase, MessageSquare, Image, Pin, Lock, ArrowRight } from 'lucide-react';
import { BOT_COMMAND_CATALOG } from '@/lib/commands';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { animateModalOpen, animateModalClose } from '@/lib/animations';

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

  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigationItems: PaletteItem[] = [
    { label: 'Server Overview', path: `/dashboard/${guildId}`, icon: Sliders, category: 'Navigation' },
    { label: 'General Settings', path: `/dashboard/${guildId}/general`, icon: Sliders, category: 'Navigation' },
    { label: 'Permissions & Rules', path: `/dashboard/${guildId}/permissions`, icon: Lock, category: 'Navigation' },
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
    : allItems.slice(0, 10);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      animateModalOpen(containerRef.current, backdropRef.current);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    animateModalClose(containerRef.current, backdropRef.current, onClose);
  };

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
          handleClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
      />

      {/* Palette Container */}
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-xl bg-[#0d0e10] border border-[#2b2f34] rounded-lg shadow-popover-soft overflow-hidden flex flex-col max-h-[70vh]"
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-[#1c1f23] flex items-center gap-3 bg-[#08090a]">
          <Search className="w-4 h-4 text-[#7e8389] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands, pages, settings, or tools..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-[#f1f2f3] placeholder:text-[#7e8389] focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#17191c] border border-[#24272b] text-[10px] font-mono text-[#7e8389]">
            ESC
          </kbd>
        </div>

        {/* Results List (Internal Scroll Container with HawkScrollArea) */}
        <HawkScrollArea className="flex-1 p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#7e8389]">
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
                    handleClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-md flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#17191c] text-[#f1f2f3] border border-[#2b2f34]'
                      : 'text-[#d5d7da] hover:bg-[#121417] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-6 h-6 rounded bg-[#17191c] border border-[#24272b] flex items-center justify-center shrink-0">
                      <Icon className="w-3 h-3 text-[#a9adb2]" />
                    </div>
                    <div className="overflow-hidden space-y-0.5">
                      <div className="text-xs font-medium text-[#f1f2f3] truncate">{item.label}</div>
                      {item.subLabel && (
                        <div className="text-[10px] font-mono text-[#7e8389] truncate">{item.subLabel}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#121417] text-[#7e8389] border border-[#24272b]">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#f1f2f3]" />}
                  </div>
                </div>
              );
            })
          )}
        </HawkScrollArea>

        {/* Palette Footer */}
        <div className="px-4 py-2 border-t border-[#1c1f23] bg-[#08090a] flex items-center justify-between text-[10px] font-mono text-[#7e8389]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Hawk Ops Console</span>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Command,
  Sliders,
  Coins,
  Radio,
  ShoppingBag,
  Gamepad2,
  Briefcase,
  MessageSquare,
  Image,
  Pin,
  Lock,
  ArrowRight,
  HeartHandshake,
  Hash,
  Shield,
} from 'lucide-react';
import { BOT_COMMAND_CATALOG } from '@/lib/commands';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { animateModalOpen, animateModalClose } from '@/lib/animations';
import { useGuildData } from '@/context/GuildContext';

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
  const { channels = [], roles = [] } = useGuildData();

  const backdropRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigationItems: PaletteItem[] = [
    { label: 'Server Overview', path: `/dashboard/${guildId}`, icon: Sliders, category: 'Navigation' },
    { label: 'General Settings', path: `/dashboard/${guildId}/general`, icon: Sliders, category: 'Navigation' },
    { label: 'Permissions & Rules', path: `/dashboard/${guildId}/permissions`, icon: Lock, category: 'Navigation' },
    { label: 'Access Simulator', path: `/dashboard/${guildId}/permissions?tab=simulator`, icon: Lock, category: 'Navigation' },
    { label: 'Welcome Greetings & Embed Designer', path: `/dashboard/${guildId}/welcome`, icon: HeartHandshake, category: 'Navigation' },
    { label: 'Economy & Rewards', path: `/dashboard/${guildId}/economy`, icon: Coins, category: 'Navigation' },
    { label: 'Private Voice Channels (PVC)', path: `/dashboard/${guildId}/pvc`, icon: Radio, category: 'Navigation' },
    { label: 'Role Salaries & Income', path: `/dashboard/${guildId}/income`, icon: Briefcase, category: 'Navigation' },
    { label: 'Store Catalog', path: `/dashboard/${guildId}/store`, icon: ShoppingBag, category: 'Navigation' },
    { label: 'Gaming LFG Alerts', path: `/dashboard/${guildId}/gaming`, icon: Gamepad2, category: 'Navigation' },
    { label: 'Community Tools', path: `/dashboard/${guildId}/community`, icon: MessageSquare, category: 'Navigation' },
    { label: 'Media Channels', path: `/dashboard/${guildId}/media`, icon: Image, category: 'Navigation' },
    { label: 'Sticky Notices', path: `/dashboard/${guildId}/sticky`, icon: Pin, category: 'Navigation' },
  ];

  const channelItems: PaletteItem[] = channels.slice(0, 30).map((ch) => ({
    label: `#${ch.name}`,
    subLabel: `Channel ID: ${ch.id}`,
    path: `/dashboard/${guildId}/general`,
    icon: Hash,
    category: 'Server Channels',
  }));

  const roleItems: PaletteItem[] = roles.slice(0, 30).map((r) => ({
    label: `@${r.name}`,
    subLabel: `Role ID: ${r.id}`,
    path: `/dashboard/${guildId}/permissions`,
    icon: Shield,
    category: 'Server Roles',
  }));

  const commandItems: PaletteItem[] = BOT_COMMAND_CATALOG.map((cmd) => ({
    label: `!${cmd.name}`,
    subLabel: `${cmd.description} (${cmd.category})`,
    path: `/dashboard/${guildId}/permissions?tab=commands`,
    icon: Command,
    category: 'Bot Commands',
  }));

  const allItems: PaletteItem[] = [
    ...navigationItems,
    ...channelItems,
    ...roleItems,
    ...commandItems,
  ];

  const filtered = query.trim()
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          (item.subLabel && item.subLabel.toLowerCase().includes(query.toLowerCase())) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : navigationItems;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      animateModalOpen(containerRef.current, backdropRef.current);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleClose = () => {
    animateModalClose(containerRef.current, backdropRef.current, onClose);
  };

  const handleSelect = (path: string) => {
    handleClose();
    router.push(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex].path);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Palette Surface */}
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-xl bg-[#0d0e10] border border-[#1f2226] rounded-lg shadow-popover-clean overflow-hidden flex flex-col max-h-[75vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="px-3 py-2.5 border-b border-[#17191c] flex items-center gap-2.5 bg-[#0a0b0d]">
          <Search className="w-4 h-4 text-[#6e747c] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a page, command, channel, or role..."
            className="w-full bg-transparent text-xs text-[#ededed] placeholder:text-[#6e747c] focus:outline-none"
          />
          <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#121417] border border-[#1f2226] text-[#6e747c]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <HawkScrollArea className="flex-1 p-1.5 space-y-0.5 max-h-96">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6e747c]">
              No matching pages, commands, or server resources found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={`${item.category}-${item.label}-${idx}`}
                  onClick={() => handleSelect(item.path)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer select-none transition-colors ${
                    isSelected
                      ? 'bg-[#17191c] text-[#ededed]'
                      : 'text-[#949aa2] hover:bg-[#121417] hover:text-[#ededed]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-success' : 'text-[#6e747c]'}`} />
                    <div className="flex flex-col truncate">
                      <span className="font-medium truncate">{item.label}</span>
                      {item.subLabel && (
                        <span className="text-[10px] text-[#6e747c] truncate font-mono">
                          {item.subLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#121417] border border-[#1f2226] text-[#6e747c]">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-success shrink-0" />}
                  </div>
                </div>
              );
            })
          )}
        </HawkScrollArea>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-[#17191c] bg-[#0a0b0d] flex items-center justify-between text-[10px] text-[#6e747c] font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>Hawk Ops Quick Console</span>
        </div>
      </div>
    </div>
  );
}

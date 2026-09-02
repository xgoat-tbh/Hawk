'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DiscordChannel } from '@/lib/discord';
import { Search, ChevronDown, X, Hash, Volume2, Folder, Megaphone } from 'lucide-react';

interface SearchableChannelSelectProps {
  channels: DiscordChannel[];
  value: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
  allowedTypes?: number[]; // 0: text, 2: voice, 4: category, 5: announcement
}

export function SearchableChannelSelect({
  channels = [],
  value,
  onChange,
  placeholder = 'Select a channel...',
  allowedTypes = [0, 5],
}: SearchableChannelSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredChannels = channels
    .filter((c) => allowedTypes.includes(c.type))
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const selectedChannel = channels.find((c) => c.id === value);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getChannelIcon = (type: number) => {
    switch (type) {
      case 2:
      case 13:
        return <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 4:
        return <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 5:
        return <Megaphone className="w-3.5 h-3.5 text-violet-400 shrink-0" />;
      default:
        return <Hash className="w-3.5 h-3.5 text-[#5865F2] shrink-0" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : 'z-0'}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#040406] border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-xs text-white flex items-center justify-between cursor-pointer hover:border-white/[0.20] transition-all select-none text-left"
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedChannel ? (
            <>
              {getChannelIcon(selectedChannel.type)}
              <span className="font-semibold text-white tracking-wide truncate">
                {selectedChannel.name}
              </span>
            </>
          ) : (
            <span className="text-white/40 font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {selectedChannel && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover & Backdrop */}
      {isOpen && (
        <>
          {/* Invisible backdrop to dismiss and isolate stacking context */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-1.5 w-full bg-[#0a0a0c] border border-white/[0.16] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden backdrop-blur-2xl">
            {/* Search Header */}
            <div className="p-2.5 border-b border-white/[0.08] flex items-center justify-between gap-2 bg-[#040406]">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-3.5 h-3.5 text-white/40 shrink-0 ml-1" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search channels..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>
              <span className="text-[10px] font-mono text-white/30 px-1">
                {filteredChannels.length} {filteredChannels.length === 1 ? 'channel' : 'channels'}
              </span>
            </div>

            {/* Channel List */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {filteredChannels.length === 0 ? (
                <div className="py-6 text-center text-xs text-white/30">
                  {channels.length === 0 ? 'No channels loaded from server.' : 'No matching channels found'}
                </div>
              ) : (
                filteredChannels.map((channel) => {
                  const isSelected = channel.id === value;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => {
                        onChange(channel.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-[#5865F2]/20 text-white font-semibold'
                          : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {getChannelIcon(channel.type)}
                        <span className="truncate">{channel.name}</span>
                      </div>

                      <span className="text-[10px] text-white/30 font-mono">
                        {channel.type === 2 ? 'Voice' : channel.type === 4 ? 'Category' : channel.type === 5 ? 'News' : 'Text'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const ChannelSelect = SearchableChannelSelect;
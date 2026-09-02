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
  channels,
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
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#040406] border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-xs text-white flex items-center justify-between cursor-pointer hover:border-white/[0.20] transition-all select-none"
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        </div>
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-[#08080a] border border-white/[0.14] rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-2xl">
          {/* Search Input */}
          <div className="p-2 border-b border-white/[0.08] flex items-center gap-2 bg-[#040406]">
            <Search className="w-3.5 h-3.5 text-white/40 shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels..."
              className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-white/40 hover:text-white text-[10px]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Channel List */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
            {filteredChannels.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-white/30">No matching channels found</div>
            ) : (
              filteredChannels.map((channel) => {
                const isSelected = channel.id === value;
                return (
                  <div
                    key={channel.id}
                    onClick={() => {
                      onChange(channel.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const ChannelSelect = SearchableChannelSelect;
'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DiscordEmoji } from '@/lib/discord';
import { Smile, Search, X } from 'lucide-react';

interface EmojiPickerProps {
  emojis: DiscordEmoji[];
  onSelectEmoji: (emojiCode: string) => void;
  buttonLabel?: string;
}

export function EmojiPicker({ emojis = [], onSelectEmoji, buttonLabel = 'Server Emojis' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredEmojis = emojis.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block ${isOpen ? 'z-50' : 'z-0'}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all flex items-center gap-1.5 font-medium"
      >
        <Smile className="w-3.5 h-3.5 text-amber-400" />
        <span>{buttonLabel}</span>
      </button>

      {/* Popover Menu & Backdrop */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full mt-1.5 w-80 bg-[#0a0a0c] border border-white/[0.16] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden backdrop-blur-2xl">
            {/* Search Header */}
            <div className="p-2.5 border-b border-white/[0.08] flex items-center justify-between gap-2 bg-[#040406]">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-3.5 h-3.5 text-white/40 shrink-0 ml-1" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search server emojis..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>
              <span className="text-[10px] font-mono text-white/30 px-1">
                {filteredEmojis.length}
              </span>
            </div>

            {/* Emoji Grid */}
            <div className="max-h-64 overflow-y-auto p-2.5 custom-scrollbar">
              {filteredEmojis.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/30">
                  {emojis.length === 0 ? 'No custom emojis found in this server.' : 'No matching emojis found.'}
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {filteredEmojis.map((emoji) => {
                    const emojiCode = emoji.animated
                      ? `<a:${emoji.name}:${emoji.id}>`
                      : `<:${emoji.name}:${emoji.id}>`;

                    return (
                      <button
                        key={emoji.id}
                        type="button"
                        onClick={() => {
                          onSelectEmoji(emojiCode);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        title={`:${emoji.name}:`}
                        className="w-10 h-10 rounded-lg p-1.5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all group"
                      >
                        <img
                          src={emoji.url || `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48&quality=lossless`}
                          alt={emoji.name}
                          className="w-7 h-7 object-contain group-hover:scale-110 transition-transform"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
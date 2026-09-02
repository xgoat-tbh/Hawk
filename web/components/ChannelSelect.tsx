'use client';

import React from 'react';
import { Hash, Volume2, Folder } from 'lucide-react';
import type { DiscordChannel } from '@/lib/discord';

interface ChannelSelectProps {
  channels: DiscordChannel[];
  value: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
  allowedTypes?: number[]; // 0: text, 2: voice, 4: category
}

export function ChannelSelect({
  channels,
  value,
  onChange,
  placeholder = 'Select a channel...',
  allowedTypes = [0],
}: ChannelSelectProps) {
  const filtered = channels.filter((c) => allowedTypes.includes(c.type));

  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surfaceHover transition-colors"
      >
        <option value="">{placeholder}</option>
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>
            {c.type === 2 ? `🔊 ${c.name}` : c.type === 4 ? `📁 ${c.name}` : `# ${c.name}`}
          </option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
        ▼
      </div>
    </div>
  );
}

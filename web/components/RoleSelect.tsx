'use client';

import React from 'react';
import type { DiscordRole } from '@/lib/discord';

interface RoleSelectProps {
  roles: DiscordRole[];
  value: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
}

export function RoleSelect({
  roles,
  value,
  onChange,
  placeholder = 'Select a role...',
}: RoleSelectProps) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent appearance-none cursor-pointer hover:bg-surfaceHover transition-colors"
      >
        <option value="">{placeholder}</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            @{r.name}
          </option>
        ))}
      </select>
      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
        ▼
      </div>
    </div>
  );
}

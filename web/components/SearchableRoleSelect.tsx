'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DiscordRole } from '@/lib/discord';
import { Search, ChevronDown, X, Shield } from 'lucide-react';

interface SearchableRoleSelectProps {
  roles: DiscordRole[];
  value: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
}

export function SearchableRoleSelect({
  roles,
  value,
  onChange,
  placeholder = 'Select a role...',
}: SearchableRoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert Discord integer color to hex
  const intToHex = (colorInt: number) => {
    if (!colorInt) return '#99aab5';
    return '#' + colorInt.toString(16).padStart(6, '0');
  };

  const selectedRole = roles.find((r) => r.id === value);

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#040406] border border-white/[0.10] rounded-xl px-3.5 py-2.5 text-xs text-white flex items-center justify-between cursor-pointer hover:border-white/[0.20] transition-all select-none"
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedRole ? (
            <>
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: intToHex(selectedRole.color) }}
              />
              <span className="font-semibold text-white tracking-wide truncate">
                @{selectedRole.name}
              </span>
            </>
          ) : (
            <span className="text-white/40 font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {selectedRole && (
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
              placeholder="Search roles..."
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

          {/* Role List */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
            {filteredRoles.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-white/30">No matching roles found</div>
            ) : (
              filteredRoles.map((role) => {
                const isSelected = role.id === value;
                const roleHex = intToHex(role.color);
                return (
                  <div
                    key={role.id}
                    onClick={() => {
                      onChange(role.id);
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
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: roleHex }}
                      />
                      <span className="truncate">@{role.name}</span>
                    </div>

                    {role.managed && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-mono">
                        Bot
                      </span>
                    )}
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

export const RoleSelect = SearchableRoleSelect;
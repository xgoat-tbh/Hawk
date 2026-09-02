'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DiscordRole } from '@/lib/discord';
import { Search, ChevronDown, X } from 'lucide-react';

interface SearchableRoleSelectProps {
  roles: DiscordRole[];
  value: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
}

export function SearchableRoleSelect({
  roles = [],
  value,
  onChange,
  placeholder = 'Select a role...',
}: SearchableRoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert Discord integer color to hex
  const intToHex = (colorInt: number) => {
    if (!colorInt) return '#8e8e93';
    return '#' + colorInt.toString(16).padStart(6, '0');
  };

  const selectedRole = roles.find((r) => r.id === value);

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : 'z-0'}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#050507] border border-white/[0.09] rounded-xl px-3.5 py-2.5 text-xs text-white flex items-center justify-between cursor-pointer hover:border-white/[0.18] transition-all select-none text-left"
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedRole ? (
            <>
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: intToHex(selectedRole.color) }}
              />
              <span className="font-medium text-white tracking-wide truncate">
                @{selectedRole.name}
              </span>
            </>
          ) : (
            <span className="text-white/40 font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {selectedRole && (
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
          {/* Invisible backdrop to dismiss */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-1.5 w-full bg-[#0a0a0d] border border-white/[0.12] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-50 overflow-hidden backdrop-blur-2xl">
            {/* Search Header */}
            <div className="p-2.5 border-b border-white/[0.07] flex items-center justify-between gap-2 bg-[#050507]">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-3.5 h-3.5 text-white/40 shrink-0 ml-1" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search roles..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>
              <span className="text-[10px] font-mono text-white/30 px-1">
                {filteredRoles.length} {filteredRoles.length === 1 ? 'role' : 'roles'}
              </span>
            </div>

            {/* Role List */}
            <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
              {filteredRoles.length === 0 ? (
                <div className="py-6 text-center text-xs text-white/30">
                  {roles.length === 0 ? 'No roles loaded from server.' : 'No matching roles found'}
                </div>
              ) : (
                filteredRoles.map((role) => {
                  const isSelected = role.id === value;
                  const roleHex = intToHex(role.color);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        onChange(role.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-white/[0.08] text-white font-medium border border-white/10'
                          : 'text-white/80 hover:bg-white/[0.04] hover:text-white'
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

export const RoleSelect = SearchableRoleSelect;
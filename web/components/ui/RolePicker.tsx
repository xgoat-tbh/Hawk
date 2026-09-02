'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DiscordRole } from '@/lib/discord';
import { Search, ChevronDown, X, Shield, Check } from 'lucide-react';
import { HawkScrollArea } from './HawkScrollArea';
import { animateDropdownOpen, animateDropdownClose } from '@/lib/animations';

export interface RolePickerProps {
  roles: DiscordRole[];
  value: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RolePicker({
  roles = [],
  value,
  onChange,
  placeholder = 'Select a role...',
  disabled = false,
  className = '',
}: RolePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Convert Discord integer color to hex string
  const intToHex = (colorInt: number) => {
    if (!colorInt) return '#6b7280';
    return '#' + colorInt.toString(16).padStart(6, '0');
  };

  const selectedRole = roles.find((r) => r.id === value);

  const filteredRoles = search.trim()
    ? roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : roles;

  // Animate popover open
  useEffect(() => {
    if (isOpen && menuRef.current) {
      animateDropdownOpen(menuRef.current);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleClose = () => {
    if (menuRef.current) {
      animateDropdownClose(menuRef.current, () => {
        setIsOpen(false);
        setSearch('');
      });
    } else {
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleSelect = (roleId: string) => {
    onChange(roleId);
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredRoles.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredRoles.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredRoles[highlightedIndex];
      if (current) {
        handleSelect(current.id);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative w-full ${isOpen ? 'z-50' : 'z-0'} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className="w-full bg-[#0a0b0d] border border-[#24272b] rounded-md px-3 py-2 text-xs text-[#f1f2f3] flex items-center justify-between cursor-pointer hover:border-[#2b2f34] shadow-clay-input focus:outline-none focus:border-border-focus transition-all select-none text-left disabled:opacity-40 disabled:pointer-events-none"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedRole ? (
            <>
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: intToHex(selectedRole.color) }}
              />
              <span className="font-medium text-[#f1f2f3] truncate">
                @{selectedRole.name}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-[#7e8389]">
              <Shield className="w-3.5 h-3.5 text-[#7e8389]" />
              <span>{placeholder}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {selectedRole && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="p-0.5 rounded text-[#7e8389] hover:text-[#f1f2f3] hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#7e8389] transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-[#f1f2f3]' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1.5 w-full bg-[#0d0e10] border border-[#2b2f34] rounded-md shadow-popover-soft z-50 overflow-hidden backdrop-blur-xl"
        >
          {/* Search Header */}
          <div className="p-2 border-b border-[#24272b] bg-[#0a0b0d] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-3.5 h-3.5 text-[#7e8389] shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search roles..."
                className="w-full bg-transparent text-xs text-[#f1f2f3] placeholder:text-[#7e8389] focus:outline-none"
              />
            </div>
            <span className="text-[10px] font-mono text-[#7e8389] px-1">
              {filteredRoles.length} {filteredRoles.length === 1 ? 'role' : 'roles'}
            </span>
          </div>

          {/* Roles Scroll List */}
          <HawkScrollArea maxHeight="220px" className="p-1 space-y-0.5">
            {filteredRoles.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#7e8389]">
                {roles.length === 0 ? 'No roles loaded from server' : 'No matching roles found'}
              </div>
            ) : (
              filteredRoles.map((role, idx) => {
                const isSelected = role.id === value;
                const isHighlighted = idx === highlightedIndex;
                const roleHex = intToHex(role.color);

                return (
                  <div
                    key={role.id}
                    onClick={() => handleSelect(role.id)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm cursor-pointer text-xs transition-colors select-none ${
                      isSelected
                        ? 'bg-[#17191c] text-[#f1f2f3] font-medium border border-[#2b2f34]'
                        : isHighlighted
                        ? 'bg-[#121417] text-[#f1f2f3]'
                        : 'text-[#d5d7da] hover:bg-[#121417]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: roleHex }}
                      />
                      <span className="truncate">@{role.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {role.managed && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#17191c] border border-[#24272b] text-[#7e8389] font-mono">
                          Bot
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-success stroke-[2.5]" />}
                    </div>
                  </div>
                );
              })
            )}
          </HawkScrollArea>
        </div>
      )}
    </div>
  );
}

export const RoleSelect = RolePicker;

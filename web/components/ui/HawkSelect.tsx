'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { HawkScrollArea } from './HawkScrollArea';
import { animateDropdownOpen, animateDropdownClose } from '@/lib/animations';

export interface HawkSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface HawkSelectProps {
  options: HawkSelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}

export function HawkSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  searchable = true,
  clearable = false,
  disabled = false,
  className = '',
}: HawkSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = searchable && search.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.description && o.description.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  // Animate popover open
  useEffect(() => {
    if (isOpen && menuRef.current) {
      animateDropdownOpen(menuRef.current);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen]);

  // Close on outside click
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

  const handleSelect = (val: string) => {
    onChange(val);
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
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredOptions[highlightedIndex];
      if (current) {
        handleSelect(current.value);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative w-full ${isOpen ? 'z-[100]' : 'z-0'} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className={`w-full bg-[#0a0b0d] border border-[#24272b] rounded-md px-3 py-2 text-xs text-[#f1f2f3] flex items-center justify-between cursor-pointer hover:border-[#2b2f34] shadow-clay-input focus:outline-none focus:border-border-focus transition-all select-none text-left disabled:opacity-40 disabled:pointer-events-none`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          {selectedOption ? (
            <span className="font-medium text-[#f1f2f3] truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-[#7e8389]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {clearable && selectedOption && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
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

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1.5 w-full bg-[#0d0e10] border border-[#2b2f34] rounded-md shadow-2xl z-[100] overflow-hidden"
        >
          {/* Search Header if enabled */}
          {searchable && options.length > 5 && (
            <div className="p-2 border-b border-[#24272b] bg-[#0a0b0d] flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#7e8389] shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Filter options..."
                className="w-full bg-transparent text-xs text-[#f1f2f3] placeholder:text-[#7e8389] focus:outline-none"
              />
            </div>
          )}

          {/* Options List */}
          <HawkScrollArea maxHeight="220px" className="p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#7e8389]">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm cursor-pointer text-xs transition-colors select-none ${
                      isSelected
                        ? 'bg-[#17191c] text-[#f1f2f3] font-medium border border-[#2b2f34]'
                        : isHighlighted
                        ? 'bg-[#121417] text-[#f1f2f3]'
                        : 'text-[#d5d7da] hover:bg-[#121417]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate">
                        <div className="truncate font-medium">{opt.label}</div>
                        {opt.description && (
                          <div className="text-[10px] text-[#7e8389] truncate">{opt.description}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {opt.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#17191c] border border-[#24272b] text-[#a9adb2]">
                          {opt.badge}
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

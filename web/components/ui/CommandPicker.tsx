'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Terminal, Check } from 'lucide-react';
import { HawkScrollArea } from './HawkScrollArea';
import { animateDropdownOpen, animateDropdownClose } from '@/lib/animations';

export interface CommandItem {
  name: string;
  category?: string;
  description?: string;
  aliases?: string[];
  module?: string;
}

export interface CommandPickerProps {
  commands?: CommandItem[];
  value: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CommandPicker({
  commands = [],
  value,
  onChange,
  placeholder = 'Select a command...',
  disabled = false,
  className = '',
}: CommandPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCmd = commands.find(
    (c) => c.name.toLowerCase() === value?.toLowerCase()
  );

  const filteredCommands = search.trim()
    ? commands.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.category?.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase()) ||
          c.aliases?.some((a) => a.toLowerCase().includes(search.toLowerCase()))
      )
    : commands;

  useEffect(() => {
    if (isOpen && menuRef.current) {
      animateDropdownOpen(menuRef.current);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen]);

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

  const handleSelect = (cmdName: string) => {
    onChange(cmdName);
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[highlightedIndex]) {
        handleSelect(filteredCommands[highlightedIndex].name);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative w-full ${isOpen ? 'z-[100]' : 'z-0'} ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className="w-full bg-[#0a0b0d] border border-[#1f2226] rounded-md px-3 py-1.5 text-xs text-[#ededed] flex items-center justify-between cursor-pointer hover:border-[#2a2d33] shadow-tactile-input focus:outline-none focus:border-[#3d424a] select-none text-left disabled:opacity-35 disabled:pointer-events-none"
      >
        <div className="flex items-center gap-2 truncate">
          <Terminal className="w-3.5 h-3.5 text-[#6e747c] shrink-0" />
          {selectedCmd ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono font-medium text-[#ededed]">!{selectedCmd.name}</span>
              {selectedCmd.category && (
                <span className="text-[9px] font-mono text-[#949aa2] bg-[#121417] px-1 py-0.2 rounded border border-[#1f2226]">
                  {selectedCmd.category}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[#6e747c]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="p-0.5 rounded text-[#6e747c] hover:text-[#ededed] hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#6e747c] transition-transform duration-100 ${
              isOpen ? 'rotate-180 text-[#ededed]' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1.5 w-full bg-[#0d0e10] border border-[#1f2226] rounded-md shadow-popover-clean z-[100] overflow-hidden"
        >
          <div className="p-2 border-b border-[#17191c] bg-[#0a0b0d] flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#6e747c] shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Search commands or categories..."
              className="w-full bg-transparent text-xs text-[#ededed] placeholder:text-[#6e747c] focus:outline-none"
            />
          </div>

          <HawkScrollArea maxHeight="220px" className="p-1 space-y-0.5">
            {filteredCommands.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#6e747c]">
                No matching commands found
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => {
                const isSelected = cmd.name.toLowerCase() === value?.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={cmd.name}
                    onClick={() => handleSelect(cmd.name)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer select-none transition-colors ${
                      isSelected
                        ? 'bg-success-soft text-success-text font-medium'
                        : isHighlighted
                        ? 'bg-[#17191c] text-[#ededed]'
                        : 'text-[#c8ccd0] hover:bg-[#121417]'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#ededed]">!{cmd.name}</span>
                        {cmd.category && (
                          <span className="text-[9px] font-mono text-[#6e747c] bg-[#121417] px-1 rounded border border-[#1f2226]">
                            {cmd.category}
                          </span>
                        )}
                      </div>
                      {cmd.description && (
                        <span className="text-[10px] text-[#6e747c] truncate">
                          {cmd.description}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
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

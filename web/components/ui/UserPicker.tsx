'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, User, Check } from 'lucide-react';
import { HawkScrollArea } from './HawkScrollArea';
import { animateDropdownOpen, animateDropdownClose } from '@/lib/animations';

export interface UserOption {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string | null;
  roleName?: string;
}

export interface UserPickerProps {
  value: string;
  onChange: (userId: string, userName?: string) => void;
  users?: UserOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function UserPicker({
  value,
  onChange,
  users = [],
  placeholder = 'Enter or search Discord User...',
  disabled = false,
  className = '',
}: UserPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customIdInput, setCustomIdInput] = useState(value || '');

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomIdInput(value || '');
  }, [value]);

  const filteredUsers = search.trim()
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          (u.displayName && u.displayName.toLowerCase().includes(search.toLowerCase())) ||
          u.id.includes(search)
      )
    : users;

  const selectedUser = users.find((u) => u.id === value);

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

  const handleSelectUser = (user: UserOption) => {
    setCustomIdInput(user.id);
    onChange(user.id, user.displayName || user.username);
    handleClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customIdInput.trim().replace(/[<@!>]/g, '');
    if (clean) {
      onChange(clean, `User ${clean.slice(-4)}`);
      handleClose();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : 'z-0'} ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className="w-full bg-[#0a0b0d] border border-[#24272b] rounded-md px-3 py-2 text-xs text-[#f1f2f3] flex items-center justify-between cursor-pointer hover:border-[#2b2f34] shadow-clay-input focus:outline-none focus:border-border-focus transition-all select-none text-left disabled:opacity-40 disabled:pointer-events-none"
      >
        <div className="flex items-center gap-2 truncate">
          <User className="w-3.5 h-3.5 text-[#7e8389] shrink-0" />
          {selectedUser ? (
            <div className="truncate">
              <span className="font-medium text-[#f1f2f3]">{selectedUser.displayName || selectedUser.username}</span>
              <span className="text-[10px] font-mono text-[#7e8389] ml-1.5">{selectedUser.id}</span>
            </div>
          ) : value ? (
            <span className="font-mono text-[#f1f2f3] truncate">{value}</span>
          ) : (
            <span className="text-[#7e8389]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setCustomIdInput('');
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

      {/* Popover */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1.5 w-full bg-[#0d0e10] border border-[#2b2f34] rounded-md shadow-popover-soft z-50 overflow-hidden backdrop-blur-xl"
        >
          {/* Direct ID Input Form */}
          <form onSubmit={handleManualSubmit} className="p-2 border-b border-[#24272b] bg-[#0a0b0d] flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#7e8389] shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={customIdInput}
              onChange={(e) => {
                setCustomIdInput(e.target.value);
                setSearch(e.target.value);
              }}
              placeholder="Paste Discord User ID or search..."
              className="w-full bg-transparent text-xs text-[#f1f2f3] placeholder:text-[#7e8389] focus:outline-none font-mono"
            />
            {customIdInput.trim() && (
              <button
                type="submit"
                className="px-2 py-0.5 rounded bg-[#17191c] border border-[#24272b] text-[10px] font-mono text-[#f1f2f3] hover:bg-[#25282c] shrink-0"
              >
                Use ID
              </button>
            )}
          </form>

          {/* User Suggestions List */}
          <HawkScrollArea maxHeight="200px" className="p-1 space-y-0.5">
            {filteredUsers.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#7e8389]">
                {customIdInput.trim() ? 'Press Enter to apply User ID directly' : 'No recent users found'}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = user.id === value;
                return (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm cursor-pointer text-xs transition-colors select-none ${
                      isSelected
                        ? 'bg-[#17191c] text-[#f1f2f3] font-medium border border-[#2b2f34]'
                        : 'text-[#d5d7da] hover:bg-[#121417]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-5 h-5 rounded-full object-cover border border-[#24272b]"
                        />
                      ) : (
                        <User className="w-4 h-4 text-[#7e8389]" />
                      )}
                      <div className="truncate">
                        <div className="font-medium text-[#f1f2f3] truncate">
                          {user.displayName || user.username}
                        </div>
                        <div className="text-[10px] font-mono text-[#7e8389] truncate">
                          {user.id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {user.roleName && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#17191c] border border-[#24272b] text-[#a9adb2]">
                          @{user.roleName}
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

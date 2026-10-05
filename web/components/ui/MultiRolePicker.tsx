'use client';

import React, { useState, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronDown, X, Shield, Search } from 'lucide-react';
import type { DiscordRole } from '@/lib/discord';

export interface MultiRolePickerProps {
  roles: DiscordRole[];
  values: string[];
  onChange: (roleIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MultiRolePicker({
  roles = [],
  values = [],
  onChange,
  disabled = false,
  placeholder = 'Select required roles…',
  className = '',
}: MultiRolePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedRoles = useMemo(() => {
    return values
      .map(id => roles.find(r => r.id === id))
      .filter((r): r is DiscordRole => Boolean(r));
  }, [roles, values]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      r => r.name.toLowerCase().includes(q) || r.id.includes(q)
    );
  }, [roles, search]);

  const toggleRole = (roleId: string) => {
    if (disabled) return;
    if (values.includes(roleId)) {
      onChange(values.filter(id => id !== roleId));
    } else {
      onChange([...values, roleId]);
    }
  };

  const removeRole = (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(values.filter(id => id !== roleId));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange([]);
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(roles.map(r => r.id));
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Selected Chips Display */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-surface-1 border border-border/80 min-h-10">
          {selectedRoles.map(role => {
            const roleHex = role.color
              ? `#${role.color.toString(16).padStart(6, '0')}`
              : '#94a3b8';

            return (
              <span
                key={role.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all"
                style={{
                  backgroundColor: `${roleHex}18`,
                  borderColor: `${roleHex}45`,
                  color: roleHex === '#94a3b8' ? 'var(--text-primary)' : roleHex,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: roleHex }}
                />
                <span className="truncate max-w-[140px]">{role.name}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={e => removeRole(role.id, e)}
                    className="p-0.5 rounded hover:bg-black/20 dark:hover:bg-white/20 transition-colors ml-0.5"
                    aria-label={`Remove ${role.name}`}
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            );
          })}
          {!disabled && selectedRoles.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] text-text-muted hover:text-critical-text px-2 py-1 rounded transition-colors ml-auto font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Popover Dropdown Trigger */}
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild disabled={disabled}>
          <button
            type="button"
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 transition-colors text-sm text-left outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            aria-label="Required roles picker"
          >
            <div className="flex items-center gap-2 truncate">
              <Shield size={15} className="text-text-muted shrink-0" />
              {selectedRoles.length === 0 ? (
                <span className="text-text-muted">{placeholder}</span>
              ) : (
                <span className="text-text-primary font-medium text-xs">
                  {selectedRoles.length} role{selectedRoles.length === 1 ? '' : 's'} required
                </span>
              )}
            </div>
            <ChevronDown size={14} className="text-text-muted shrink-0 ml-2" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-[90] w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-surface-2 shadow-2xl overflow-hidden backdrop-blur-md"
          >
            <Command shouldFilter={false} label="Select required roles">
              {/* Search Box */}
              <div className="flex items-center gap-2 px-3 border-b border-border bg-surface-1">
                <Search size={14} className="text-text-muted shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search roles…"
                  className="w-full py-2.5 text-sm bg-transparent outline-none text-text-primary placeholder:text-text-muted"
                />
              </div>

              {/* Quick Actions Header */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 text-[11px] text-text-muted bg-surface-1/50">
                <span>{roles.length} available roles</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="hover:text-accent font-medium transition-colors"
                  >
                    Select all
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="hover:text-critical-text font-medium transition-colors"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Roles List */}
              <Command.List className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                {filteredRoles.length === 0 ? (
                  <Command.Empty className="p-4 text-center text-xs text-text-muted">
                    No matching roles found.
                  </Command.Empty>
                ) : (
                  filteredRoles.map(role => {
                    const isSelected = values.includes(role.id);
                    const roleHex = role.color
                      ? `#${role.color.toString(16).padStart(6, '0')}`
                      : '#94a3b8';

                    return (
                      <Command.Item
                        key={role.id}
                        value={role.id}
                        onSelect={() => toggleRole(role.id)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs select-none transition-all ${
                          isSelected
                            ? 'bg-accent/15 text-text-primary font-medium'
                            : 'hover:bg-surface-4 text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {/* Custom Checkbox */}
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-accent border-accent text-white'
                              : 'border-border bg-surface-1'
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>

                        {/* Role Color Dot */}
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: roleHex }}
                        />

                        {/* Role Name & ID */}
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">{role.name}</span>
                        </div>

                        {/* Managed Badge */}
                        {role.managed && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-5 text-text-muted border border-border shrink-0">
                            Managed
                          </span>
                        )}
                      </Command.Item>
                    );
                  })
                )}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

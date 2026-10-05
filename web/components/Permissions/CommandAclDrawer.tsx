'use client';

import React, { useState, useEffect } from 'react';
import { CommandAcl } from '@/lib/permissions';
import { AnimatedDrawer } from '@/components/ui/AnimatedDrawer';
import { RolePicker } from '@/components/ui/RolePicker';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { Shield, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { DiscordRole } from '@/lib/discord';

interface CommandAclDrawerProps {
  command: CommandAcl | null;
  isOpen: boolean;
  onClose: () => void;
  roles: DiscordRole[];
  onSave: (updated: CommandAcl) => Promise<void>;
}

export function CommandAclDrawer({
  command,
  isOpen,
  onClose,
  roles,
  onSave,
}: CommandAclDrawerProps) {

  const [roleOverrides, setRoleOverrides] = useState<CommandAcl["roleOverrides"]>(command?.roleOverrides || []);
  const [userOverrides, setUserOverrides] = useState<CommandAcl["userOverrides"]>(command?.userOverrides || []);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [overrideEffect, setOverrideEffect] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) { setRoleOverrides(command?.roleOverrides || []); setUserOverrides(command?.userOverrides || []); setSavedSuccess(false); setDuplicateWarning(null); }
  }, [isOpen, command]);
  if (!command) return null;
  const handleAddRoleOverride = () => {
    if (!selectedRoleId) return;
    setDuplicateWarning(null);

    if (roleOverrides.some((ro) => ro.roleId === selectedRoleId)) {
      setDuplicateWarning('This role already has a configured override rule.');
      setTimeout(() => setDuplicateWarning(null), 3000);
      return;
    }

    setRoleOverrides((prev) => [...prev, { roleId: selectedRoleId, effect: overrideEffect }]);
    setSelectedRoleId(null);
  };

  const handleRemoveRoleOverride = (roleId: string) => {
    setRoleOverrides((prev) => prev.filter((ro) => ro.roleId !== roleId));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onSave({
        ...command,
        roleOverrides,
        userOverrides,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setDuplicateWarning(err instanceof Error ? err.message : 'Unable to save rule. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  const getDangerVariant = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH':
        return 'danger';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <AnimatedDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={`!${command.command}`}
      subtitle={command.description}
      width="max-w-md"
    >
      <div className="space-y-6">
        {/* Command Metadata */}
        <div className="space-y-3 pb-4 border-b border-black/[0.08] dark:border-[#1c1f23]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans uppercase tracking-wider text-text-muted dark:text-text-muted">
              Risk Level
            </span>
            <StatusBadge
              status={command.dangerLevel}
              variant={getDangerVariant(command.dangerLevel)}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted dark:text-text-muted">Category:</span>
            <span className="font-sans text-text-primary dark:text-text-primary capitalize">{command.category}</span>
          </div>

          {command.requiredDiscordPerm && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted dark:text-text-muted">Discord Permission:</span>
              <span className="font-sans text-text-muted dark:text-text-secondary bg-gray-100 dark:bg-surface-3 px-2 py-0.5 rounded border border-black/[0.08] dark:border-border-strong">
                {command.requiredDiscordPerm}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted dark:text-text-muted">Default Profile:</span>
            <span className="font-sans text-text-primary dark:text-text-primary capitalize">{command.defaultRoleProfile}</span>
          </div>
        </div>

        {/* Add Role Override */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary dark:text-text-primary flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-text-muted dark:text-text-secondary" />
            <span>Add Role Override</span>
          </h4>

          {duplicateWarning && (
            <div className="p-2.5 rounded bg-warning-soft border border-warning-border text-xs text-warning-text flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <div className="space-y-2">
            <RolePicker
              roles={roles}
              value={selectedRoleId}
              onChange={setSelectedRoleId}
              placeholder="Search & select Discord role..."
            />

            <div className="flex items-center gap-2">
              <div className="flex-1 flex bg-gray-100 dark:bg-surface-1 p-0.5 rounded-md border border-black/[0.08] dark:border-border-strong">
                <button
                  type="button"
                  onClick={() => setOverrideEffect('ALLOW')}
                  className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                    overrideEffect === 'ALLOW' ? 'bg-success text-black font-semibold' : 'text-text-muted dark:text-text-muted'
                  }`}
                >
                  ALLOW
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideEffect('DENY')}
                  className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                    overrideEffect === 'DENY' ? 'bg-critical text-white font-semibold' : 'text-text-muted dark:text-text-muted'
                  }`}
                >
                  DENY
                </button>
              </div>

              <button
                type="button"
                disabled={!selectedRoleId}
                onClick={handleAddRoleOverride}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Role Overrides List (with HawkScrollArea) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans uppercase tracking-wider text-text-muted dark:text-text-muted">
              Configured Role Overrides ({roleOverrides.length})
            </span>
          </div>

          {roleOverrides.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-muted dark:text-text-muted border border-dashed border-black/[0.08] dark:border-border-strong rounded-md">
              No specific role overrides. Follows default server permissions.
            </div>
          ) : (
            <HawkScrollArea maxHeight="180px" className="space-y-1.5 pr-1">
              {roleOverrides.map((ro) => {
                const r = roles.find((role) => role.id === ro.roleId);
                return (
                  <div
                    key={ro.roleId}
                    className="p-2.5 rounded-md bg-gray-50 dark:bg-surface-3 border border-black/[0.08] dark:border-border-strong flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded ${
                          ro.effect === 'ALLOW'
                            ? 'bg-success-soft text-success-text border border-success-border'
                            : 'bg-critical-soft text-critical-text border border-critical-border'
                        }`}
                      >
                        {ro.effect}
                      </span>
                      <span className="text-xs text-text-primary dark:text-text-primary">@{r?.name || `Role ${ro.roleId}`}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRoleOverride(ro.roleId)}
                      className="p-1 rounded text-text-muted dark:text-text-muted hover:text-critical-text transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </HawkScrollArea>
          )}
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-black/[0.08] dark:border-[#1c1f23] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-outline-secondary text-xs py-1.5 px-3"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
          >
            {savedSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-black" /> : null}
            <span>{isSaving ? 'Saving...' : savedSuccess ? 'Saved' : 'Save Rule'}</span>
          </button>
        </div>
      </div>
    </AnimatedDrawer>
  );
}

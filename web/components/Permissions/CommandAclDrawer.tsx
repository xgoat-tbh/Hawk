'use client';

import React, { useState } from 'react';
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
  if (!command) return null;

  const [roleOverrides, setRoleOverrides] = useState(command.roleOverrides || []);
  const [userOverrides] = useState(command.userOverrides || []);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [overrideEffect, setOverrideEffect] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

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
      console.error('Error saving command ACL:', err);
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
        <div className="space-y-3 pb-4 border-b border-[#1c1f23]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
              Risk Level
            </span>
            <StatusBadge
              status={command.dangerLevel}
              variant={getDangerVariant(command.dangerLevel)}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#7e8389]">Category:</span>
            <span className="font-mono text-[#f1f2f3] capitalize">{command.category}</span>
          </div>

          {command.requiredDiscordPerm && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#7e8389]">Discord Permission:</span>
              <span className="font-mono text-[#d5d7da] bg-[#17191c] px-2 py-0.5 rounded border border-[#24272b]">
                {command.requiredDiscordPerm}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#7e8389]">Default Profile:</span>
            <span className="font-mono text-[#f1f2f3] capitalize">{command.defaultRoleProfile}</span>
          </div>
        </div>

        {/* Add Role Override */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#f1f2f3] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#a9adb2]" />
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
              <div className="flex-1 flex bg-[#0a0b0d] p-0.5 rounded-md border border-[#24272b]">
                <button
                  type="button"
                  onClick={() => setOverrideEffect('ALLOW')}
                  className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                    overrideEffect === 'ALLOW' ? 'bg-success text-black font-semibold' : 'text-[#7e8389]'
                  }`}
                >
                  ALLOW
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideEffect('DENY')}
                  className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                    overrideEffect === 'DENY' ? 'bg-critical text-white font-semibold' : 'text-[#7e8389]'
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
              Configured Role Overrides ({roleOverrides.length})
            </span>
          </div>

          {roleOverrides.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#7e8389] border border-dashed border-[#24272b] rounded-md">
              No specific role overrides. Follows default server permissions.
            </div>
          ) : (
            <HawkScrollArea maxHeight="180px" className="space-y-1.5 pr-1">
              {roleOverrides.map((ro) => {
                const r = roles.find((role) => role.id === ro.roleId);
                return (
                  <div
                    key={ro.roleId}
                    className="p-2.5 rounded-md bg-[#121417] border border-[#24272b] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          ro.effect === 'ALLOW'
                            ? 'bg-success-soft text-success-text border border-success-border'
                            : 'bg-critical-soft text-critical-text border border-critical-border'
                        }`}
                      >
                        {ro.effect}
                      </span>
                      <span className="text-xs text-[#f1f2f3]">@{r?.name || `Role ${ro.roleId}`}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRoleOverride(ro.roleId)}
                      className="p-1 rounded text-[#7e8389] hover:text-critical-text transition-colors"
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
        <div className="pt-4 border-t border-[#1c1f23] flex items-center justify-end gap-2">
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

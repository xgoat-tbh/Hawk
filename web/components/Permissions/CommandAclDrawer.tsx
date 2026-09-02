'use client';

import React, { useState } from 'react';
import { CommandAcl } from '@/lib/permissions';
import { AnimatedDrawer } from '@/components/ui/AnimatedDrawer';
import { RoleSelect } from '@/components/RoleSelect';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Shield, Plus, Trash2, CheckCircle2 } from 'lucide-react';
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

  const handleAddRoleOverride = () => {
    if (!selectedRoleId) return;
    if (roleOverrides.some((ro) => ro.roleId === selectedRoleId)) return;

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
      }, 800);
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
        <div className="space-y-3 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/40">
              Risk & Danger Level
            </span>
            <StatusBadge
              status={command.dangerLevel}
              variant={getDangerVariant(command.dangerLevel)}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Command Category:</span>
            <span className="font-mono text-white capitalize">{command.category}</span>
          </div>

          {command.requiredDiscordPerm && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Discord Permission:</span>
              <span className="font-mono text-white/80 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                {command.requiredDiscordPerm}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-white/50">Default Permission Profile:</span>
            <span className="font-mono text-white capitalize">{command.defaultRoleProfile}</span>
          </div>
        </div>

        {/* Add Role Override */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-white/60" />
            <span>Add Role Override</span>
          </h4>

          <div className="space-y-2">
            <RoleSelect
              roles={roles}
              value={selectedRoleId}
              onChange={setSelectedRoleId}
              placeholder="Select Discord role..."
            />

            <div className="flex items-center gap-2">
              <div className="flex-1 flex bg-[#050507] p-1 rounded-lg border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setOverrideEffect('ALLOW')}
                  className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                    overrideEffect === 'ALLOW' ? 'bg-emerald-500 text-black font-semibold' : 'text-white/50'
                  }`}
                >
                  ALLOW
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideEffect('DENY')}
                  className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                    overrideEffect === 'DENY' ? 'bg-red-500 text-white font-semibold' : 'text-white/50'
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

        {/* Active Role Overrides List (Internal Scroll Container) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Configured Role Overrides ({roleOverrides.length})
            </span>
          </div>

          {roleOverrides.length === 0 ? (
            <div className="p-4 text-center text-xs text-white/30 border border-dashed border-white/10 rounded-xl">
              No specific role overrides. Follows default server permissions.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {roleOverrides.map((ro) => {
                const r = roles.find((role) => role.id === ro.roleId);
                return (
                  <div
                    key={ro.roleId}
                    className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          ro.effect === 'ALLOW'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {ro.effect}
                      </span>
                      <span className="text-xs text-white">@{r?.name || `Role ${ro.roleId}`}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRoleOverride(ro.roleId)}
                      className="p-1 rounded text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
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

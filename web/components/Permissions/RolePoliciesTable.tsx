'use client';

import React, { useState } from 'react';
import { RolePolicy, PermissionProfile } from '@/lib/permissions';
import { RoleSelect } from '@/components/RoleSelect';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Shield, Plus, Trash2 } from 'lucide-react';
import type { DiscordRole } from '@/lib/discord';

interface RolePoliciesTableProps {
  policies: RolePolicy[];
  profiles: PermissionProfile[];
  roles: DiscordRole[];
  onSavePolicies: (updated: RolePolicy[]) => Promise<void>;
}

export function RolePoliciesTable({
  policies,
  profiles,
  roles,
  onSavePolicies,
}: RolePoliciesTableProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('moderator');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddPolicy = async () => {
    if (!selectedRoleId) return;
    const targetRole = roles.find((r) => r.id === selectedRoleId);
    if (!targetRole) return;

    setIsAdding(true);
    try {
      const updated: RolePolicy[] = [
        ...policies.filter((p) => p.roleId !== selectedRoleId),
        {
          roleId: selectedRoleId,
          roleName: targetRole.name,
          profileId: selectedProfileId,
          memberCount: 0,
          status: 'active',
        },
      ];
      await onSavePolicies(updated);
      setSelectedRoleId(null);
    } catch (err) {
      console.error('Failed to add role policy:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemovePolicy = async (roleId: string) => {
    const updated = policies.filter((p) => p.roleId !== roleId);
    await onSavePolicies(updated);
  };

  const handleChangeProfile = async (roleId: string, newProfileId: string) => {
    const updated = policies.map((p) => (p.roleId === roleId ? { ...p, profileId: newProfileId } : p));
    await onSavePolicies(updated);
  };

  return (
    <div className="space-y-4">
      {/* Add Role Policy Bar */}
      <div className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <RoleSelect
            roles={roles}
            value={selectedRoleId}
            onChange={setSelectedRoleId}
            placeholder="Select Discord role to map..."
          />
        </div>

        <div className="sm:w-48">
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="glass-input font-sans text-xs"
          >
            {profiles.map((pr) => (
              <option key={pr.id} value={pr.id} className="bg-[#0a0a0c] text-white">
                {pr.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!selectedRoleId || isAdding}
          onClick={handleAddPolicy}
          className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Map Role</span>
        </button>
      </div>

      {/* Role Policies Data Table (with Independent Internal Scroll) */}
      <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#08080a]">
        <div className="max-h-[50vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#0d0d10] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-white/40">
              <tr>
                <th className="py-3 px-4">Discord Role</th>
                <th className="py-3 px-4">Assigned Profile</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-white/30 text-xs">
                    No roles mapped to permission profiles. Map roles above to grant access.
                  </td>
                </tr>
              ) : (
                policies.map((p) => {
                  const currentRole = roles.find((r) => r.id === p.roleId);
                  return (
                    <tr key={p.roleId} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-white/60 shrink-0" />
                          <span className="font-medium text-white">
                            @{currentRole?.name || p.roleName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={p.profileId}
                          onChange={(e) => handleChangeProfile(p.roleId, e.target.value)}
                          className="bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1 text-xs text-white"
                        >
                          {profiles.map((pr) => (
                            <option key={pr.id} value={pr.id} className="bg-[#0a0a0c] text-white">
                              {pr.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status="Active" variant="operational" />
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemovePolicy(p.roleId)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors"
                          title="Remove policy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

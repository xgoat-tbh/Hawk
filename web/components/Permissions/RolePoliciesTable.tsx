'use client';

import React, { useState } from 'react';
import { RolePolicy, PermissionProfile } from '@/lib/permissions';
import { RolePicker } from '@/components/ui/RolePicker';
import { HawkSelect } from '@/components/ui/HawkSelect';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
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

  const profileOptions = profiles.map((p) => ({
    value: p.id,
    label: p.name,
    description: p.description,
  }));

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
      <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <RolePicker
            roles={roles}
            value={selectedRoleId}
            onChange={setSelectedRoleId}
            placeholder="Search Discord role to map..."
          />
        </div>

        <div className="sm:w-56">
          <HawkSelect
            options={profileOptions}
            value={selectedProfileId}
            onChange={setSelectedProfileId}
            placeholder="Assign profile..."
          />
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

      {/* Role Policies Data Table with HawkScrollArea */}
      <div className="border border-[#24272b] rounded-md overflow-hidden bg-[#0d0e10]">
        <HawkScrollArea maxHeight="45vh">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#1c1f23] text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
              <tr>
                <th className="py-2.5 px-4">Discord Role</th>
                <th className="py-2.5 px-4">Assigned Profile</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1f23]">
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#7e8389] text-xs">
                    No roles mapped to permission profiles. Map roles above to grant access.
                  </td>
                </tr>
              ) : (
                policies.map((p) => {
                  const currentRole = roles.find((r) => r.id === p.roleId);
                  return (
                    <tr key={p.roleId} className="hover:bg-[#121417]/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-[#7e8389] shrink-0" />
                          <span className="font-medium text-[#f1f2f3]">
                            @{currentRole?.name || p.roleName}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 w-52">
                        <HawkSelect
                          options={profileOptions}
                          value={p.profileId}
                          onChange={(val) => handleChangeProfile(p.roleId, val)}
                        />
                      </td>

                      <td className="py-2.5 px-4">
                        <StatusBadge status="Active" variant="operational" />
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemovePolicy(p.roleId)}
                          className="p-1.5 rounded-md text-[#7e8389] hover:text-critical-text hover:bg-critical-soft transition-colors"
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
        </HawkScrollArea>
      </div>
    </div>
  );
}

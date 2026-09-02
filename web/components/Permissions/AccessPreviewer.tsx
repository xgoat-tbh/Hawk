'use client';

import React, { useState } from 'react';
import {
  MODULE_DEFINITIONS,
  PermissionProfile,
  RolePolicy,
  UserOverride,
  resolveEffectivePermission,
} from '@/lib/permissions';
import { CheckCircle2, XCircle, Eye } from 'lucide-react';
import type { DiscordRole } from '@/lib/discord';

interface AccessPreviewerProps {
  roles: DiscordRole[];
  profiles: PermissionProfile[];
  rolePolicies: RolePolicy[];
  userOverrides: UserOverride[];
}

export function AccessPreviewer({
  roles,
  profiles,
  rolePolicies,
  userOverrides,
}: AccessPreviewerProps) {
  const [targetType, setTargetType] = useState<'role' | 'user'>('role');
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || '');
  const [testUserId, setTestUserId] = useState('');
  const [isSuperAdminSim, setIsSuperAdminSim] = useState(false);

  // Compute allowed vs denied modules
  const currentRoleIds = targetType === 'role' && selectedRoleId ? [selectedRoleId] : [];
  const currentUserId = targetType === 'user' ? testUserId.trim() : 'preview_user';

  const moduleResults = MODULE_DEFINITIONS.map((m) => {
    const viewResult = resolveEffectivePermission({
      userId: currentUserId,
      userRoleIds: currentRoleIds,
      module: m.module,
      action: 'view',
      isOwnerOrAdmin: isSuperAdminSim,
      profiles,
      rolePolicies,
      userOverrides,
    });

    const manageResult = resolveEffectivePermission({
      userId: currentUserId,
      userRoleIds: currentRoleIds,
      module: m.module,
      action: 'manage',
      isOwnerOrAdmin: isSuperAdminSim,
      profiles,
      rolePolicies,
      userOverrides,
    });

    return {
      module: m,
      canView: viewResult.allowed,
      canManage: manageResult.allowed,
      reason: viewResult.reason,
    };
  });

  const allowedModules = moduleResults.filter((r) => r.canView);
  const deniedModules = moduleResults.filter((r) => !r.canView);

  return (
    <div className="space-y-5">
      {/* Simulation Controls */}
      <div className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-white/70" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
            Safe Permission Simulator
          </h4>
        </div>
        <p className="text-[11px] text-white/40">
          Simulate resolved dashboard visibility and command authority for any role or user.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-3">
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as 'role' | 'user')}
              className="glass-input font-sans text-xs"
            >
              <option value="role" className="bg-[#0a0a0c] text-white">Preview by Role</option>
              <option value="user" className="bg-[#0a0a0c] text-white">Preview by User ID</option>
            </select>
          </div>

          {targetType === 'role' ? (
            <div className="sm:col-span-6">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="glass-input font-sans text-xs"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#0a0a0c] text-white">
                    @{r.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="sm:col-span-6">
              <input
                type="text"
                placeholder="Enter Discord User ID..."
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                className="glass-input font-mono text-xs"
              />
            </div>
          )}

          <div className="sm:col-span-3 flex items-center justify-end">
            <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
              <input
                type="checkbox"
                checked={isSuperAdminSim}
                onChange={(e) => setIsSuperAdminSim(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-white focus:ring-0"
              />
              <span>Is Bot Admin</span>
            </label>
          </div>
        </div>
      </div>

      {/* Simulation Results Split View (Internal Scroll) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Granted Access Panel */}
        <div className="border border-emerald-500/20 rounded-xl bg-emerald-950/[0.05] p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Accessible Modules ({allowedModules.length})
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {allowedModules.length === 0 ? (
              <div className="text-xs text-white/30 p-3">No dashboard modules accessible.</div>
            ) : (
              allowedModules.map((item) => (
                <div
                  key={item.module.module}
                  className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">{item.module.label}</span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {item.canManage ? 'FULL MANAGE' : 'READ ONLY'}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40">{item.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Denied Access Panel */}
        <div className="border border-red-500/20 rounded-xl bg-red-950/[0.05] p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Restricted / Blocked Modules ({deniedModules.length})
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {deniedModules.length === 0 ? (
              <div className="text-xs text-white/30 p-3">No restricted modules. User has full server visibility.</div>
            ) : (
              deniedModules.map((item) => (
                <div
                  key={item.module.module}
                  className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white/60">{item.module.label}</span>
                    <span className="text-[10px] font-mono text-red-400">DENIED</span>
                  </div>
                  <p className="text-[10px] text-white/30">{item.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

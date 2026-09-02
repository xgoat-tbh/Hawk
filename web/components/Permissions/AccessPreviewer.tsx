'use client';

import React, { useState } from 'react';
import {
  MODULE_DEFINITIONS,
  PermissionProfile,
  RolePolicy,
  UserOverride,
  resolveEffectivePermission,
} from '@/lib/permissions';
import { RolePicker } from '@/components/ui/RolePicker';
import { UserPicker } from '@/components/ui/UserPicker';
import { HawkSelect } from '@/components/ui/HawkSelect';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { CheckCircle2, XCircle, Eye, AlertTriangle, HelpCircle } from 'lucide-react';
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
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(roles[0]?.id || null);
  const [testUserId, setTestUserId] = useState('');
  const [isSuperAdminSim, setIsSuperAdminSim] = useState(false);
  const [inspectedModule, setInspectedModule] = useState<string | null>(null);

  const targetTypeOptions = [
    { value: 'role', label: 'Preview by Role' },
    { value: 'user', label: 'Preview by User' },
  ];

  // Compute allowed vs denied modules
  const currentRoleIds = targetType === 'role' && selectedRoleId ? [selectedRoleId] : [];
  const currentUserId = targetType === 'user' ? (testUserId.trim() || 'preview_user') : 'preview_user';

  // Check for conflicts in user overrides vs role policies
  const detectConflicts = (moduleKey: string) => {
    if (targetType !== 'user' || !testUserId.trim()) return null;

    const userOverride = userOverrides.find(
      (o) => o.userId === testUserId.trim() && o.module === moduleKey
    );

    // If there's an explicit user override, note that it overrides any role policy
    if (userOverride) {
      return {
        hasConflict: true,
        type: 'USER_OVERRIDE_ACTIVE',
        message: `Explicit user override (${userOverride.effect}) takes deterministic precedence over all role-based policies.`,
      };
    }

    return null;
  };

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

    const conflict = detectConflicts(m.module);

    return {
      module: m,
      canView: viewResult.allowed,
      canManage: manageResult.allowed,
      viewReason: viewResult.reason,
      manageReason: manageResult.reason,
      conflict,
    };
  });

  const allowedModules = moduleResults.filter((r) => r.canView);
  const deniedModules = moduleResults.filter((r) => !r.canView);
  const selectedModuleDetail = moduleResults.find((r) => r.module.module === inspectedModule);

  return (
    <div className="space-y-5">
      {/* Simulation Controls */}
      <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#a9adb2]" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#f1f2f3]">
            Access Simulator & Rule Explainer
          </h4>
        </div>
        <p className="text-[11px] text-[#7e8389]">
          Simulate resolved dashboard visibility, manage permissions, and inspect deterministic rule precedence.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-3">
            <HawkSelect
              options={targetTypeOptions}
              value={targetType}
              onChange={(val) => setTargetType(val as 'role' | 'user')}
              searchable={false}
            />
          </div>

          {targetType === 'role' ? (
            <div className="sm:col-span-6">
              <RolePicker
                roles={roles}
                value={selectedRoleId}
                onChange={setSelectedRoleId}
                placeholder="Select role to preview..."
              />
            </div>
          ) : (
            <div className="sm:col-span-6">
              <UserPicker
                value={testUserId}
                onChange={(id) => setTestUserId(id)}
                placeholder="Search or enter User ID..."
              />
            </div>
          )}

          <div className="sm:col-span-3 flex items-center justify-end">
            <label className="flex items-center gap-2 text-xs text-[#a9adb2] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSuperAdminSim}
                onChange={(e) => setIsSuperAdminSim(e.target.checked)}
                className="rounded border-[#24272b] bg-[#121417] text-white focus:ring-0"
              />
              <span>Simulate Bot Admin</span>
            </label>
          </div>
        </div>
      </div>

      {/* Why Can / Can't Access Inspector Card */}
      {selectedModuleDetail && (
        <div className="p-4 rounded-md bg-[#121417] border border-[#2b2f34] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-info" />
              <h5 className="text-xs font-semibold text-[#f1f2f3]">
                Permission Breakdown: {selectedModuleDetail.module.label}
              </h5>
            </div>
            <button
              type="button"
              onClick={() => setInspectedModule(null)}
              className="text-[11px] text-[#7e8389] hover:text-[#f1f2f3]"
            >
              Close Explainer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded bg-[#0d0e10] border border-[#24272b] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#7e8389]">VIEW PERMISSION</span>
                <span className={selectedModuleDetail.canView ? 'text-success-text font-bold' : 'text-critical-text font-bold'}>
                  {selectedModuleDetail.canView ? 'GRANTED' : 'DENIED'}
                </span>
              </div>
              <p className="text-[11px] text-[#d5d7da]">{selectedModuleDetail.viewReason}</p>
            </div>

            <div className="p-3 rounded bg-[#0d0e10] border border-[#24272b] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#7e8389]">MANAGE PERMISSION</span>
                <span className={selectedModuleDetail.canManage ? 'text-success-text font-bold' : 'text-critical-text font-bold'}>
                  {selectedModuleDetail.canManage ? 'GRANTED' : 'DENIED'}
                </span>
              </div>
              <p className="text-[11px] text-[#d5d7da]">{selectedModuleDetail.manageReason}</p>
            </div>
          </div>

          {selectedModuleDetail.conflict && (
            <div className="p-2.5 rounded bg-warning-soft border border-warning-border flex items-center gap-2 text-xs text-warning-text">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{selectedModuleDetail.conflict.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Simulation Results Split View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Granted Access Panel */}
        <div className="border border-success-border rounded-md bg-success-soft/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-success-text">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Accessible Modules ({allowedModules.length})
            </span>
          </div>

          <HawkScrollArea maxHeight="300px" className="space-y-2 pr-1">
            {allowedModules.length === 0 ? (
              <div className="text-xs text-[#7e8389] p-3">No dashboard modules accessible.</div>
            ) : (
              allowedModules.map((item) => (
                <div
                  key={item.module.module}
                  onClick={() => setInspectedModule(item.module.module)}
                  className={`p-2.5 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1 cursor-pointer hover:border-[#373b42] transition-colors ${
                    inspectedModule === item.module.module ? 'ring-1 ring-info' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#f1f2f3]">{item.module.label}</span>
                    <span className="text-[10px] font-mono text-success-text">
                      {item.canManage ? 'FULL MANAGE' : 'READ ONLY'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#7e8389]">{item.viewReason}</p>
                </div>
              ))
            )}
          </HawkScrollArea>
        </div>

        {/* Denied Access Panel */}
        <div className="border border-critical-border rounded-md bg-critical-soft/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-critical-text">
            <XCircle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Restricted Modules ({deniedModules.length})
            </span>
          </div>

          <HawkScrollArea maxHeight="300px" className="space-y-2 pr-1">
            {deniedModules.length === 0 ? (
              <div className="text-xs text-[#7e8389] p-3">No restricted modules. User has full server visibility.</div>
            ) : (
              deniedModules.map((item) => (
                <div
                  key={item.module.module}
                  onClick={() => setInspectedModule(item.module.module)}
                  className={`p-2.5 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1 cursor-pointer hover:border-[#373b42] transition-colors ${
                    inspectedModule === item.module.module ? 'ring-1 ring-info' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#a9adb2]">{item.module.label}</span>
                    <span className="text-[10px] font-mono text-critical-text">DENIED</span>
                  </div>
                  <p className="text-[10px] text-[#7e8389]">{item.viewReason}</p>
                </div>
              ))
            )}
          </HawkScrollArea>
        </div>
      </div>
    </div>
  );
}

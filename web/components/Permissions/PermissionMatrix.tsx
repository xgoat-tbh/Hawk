'use client';

import React, { useState } from 'react';
import { MODULE_DEFINITIONS, PermissionProfile, ActionType } from '@/lib/permissions';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface PermissionMatrixProps {
  profile: PermissionProfile;
  onChange: (updatedProfile: PermissionProfile) => void;
  disabled?: boolean;
}

export function PermissionMatrix({ profile, onChange, disabled = false }: PermissionMatrixProps) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleExpand = (modKey: string) => {
    setExpandedModules((prev) => ({ ...prev, [modKey]: !prev[modKey] }));
  };

  const handleToggle = (moduleKey: string, action: ActionType) => {
    if (disabled) return;
    const current = profile.permissions[moduleKey]?.[action] || false;
    const updated = {
      ...profile,
      permissions: {
        ...profile.permissions,
        [moduleKey]: {
          ...(profile.permissions[moduleKey] || { view: false, manage: false, delete: false }),
          [action]: !current,
        },
      },
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden border border-white/[0.08] rounded-xl bg-[#08080a]">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-white/40">
          <div className="col-span-6">Module / Scope</div>
          <div className="col-span-2 text-center">View</div>
          <div className="col-span-2 text-center">Manage</div>
          <div className="col-span-2 text-center">Delete</div>
        </div>

        {/* Matrix Rows */}
        <div className="divide-y divide-white/[0.04]">
          {MODULE_DEFINITIONS.map((mod) => {
            const isExpanded = Boolean(expandedModules[mod.module]);
            const perms = profile.permissions[mod.module] || { view: false, manage: false, delete: false };

            return (
              <React.Fragment key={mod.module}>
                <div className="grid grid-cols-12 px-4 py-3 items-center hover:bg-white/[0.015] transition-colors">
                  <div className="col-span-6 flex items-center gap-2">
                    {mod.subItems && mod.subItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(mod.module)}
                        className="p-1 rounded text-white/40 hover:text-white transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <span className="w-5" />
                    )}

                    <div>
                      <span className="text-xs font-medium text-white">{mod.label}</span>
                      <span className="text-[9px] font-mono text-white/30 ml-2 uppercase">
                        {mod.category}
                      </span>
                    </div>
                  </div>

                  {/* View Action Checkbox */}
                  <div className="col-span-2 flex justify-center">
                    {mod.actions.view ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggle(mod.module, 'view')}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                          perms.view
                            ? 'bg-white text-black border-white'
                            : 'bg-white/[0.02] border-white/10 text-white/20 hover:border-white/30'
                        }`}
                      >
                        {perms.view ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                      </button>
                    ) : (
                      <span className="text-white/10 text-xs">—</span>
                    )}
                  </div>

                  {/* Manage Action Checkbox */}
                  <div className="col-span-2 flex justify-center">
                    {mod.actions.manage ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggle(mod.module, 'manage')}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                          perms.manage
                            ? 'bg-white text-black border-white'
                            : 'bg-white/[0.02] border-white/10 text-white/20 hover:border-white/30'
                        }`}
                      >
                        {perms.manage ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                      </button>
                    ) : (
                      <span className="text-white/10 text-xs">—</span>
                    )}
                  </div>

                  {/* Delete Action Checkbox */}
                  <div className="col-span-2 flex justify-center">
                    {mod.actions.delete ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggle(mod.module, 'delete')}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                          perms.delete
                            ? 'bg-red-500 text-white border-red-400'
                            : 'bg-white/[0.02] border-white/10 text-white/20 hover:border-white/30'
                        }`}
                      >
                        {perms.delete ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                      </button>
                    ) : (
                      <span className="text-white/10 text-xs">—</span>
                    )}
                  </div>
                </div>

                {/* Sub-items (Expandable) */}
                {isExpanded && mod.subItems && (
                  <div className="bg-[#050507] divide-y divide-white/[0.02] px-4 py-2">
                    {mod.subItems.map((sub) => (
                      <div key={sub.id} className="grid grid-cols-12 py-1.5 items-center pl-8">
                        <div className="col-span-6 text-[11px] text-white/60">
                          • {sub.label}
                        </div>
                        <div className="col-span-6 text-[10px] font-mono text-white/30">
                          Scope: {sub.action}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

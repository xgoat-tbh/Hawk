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
      <div className="overflow-hidden border border-black/[0.08] dark:border-[#24272b] rounded-md bg-white dark:bg-[#0d0e10]">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-gray-50 dark:bg-[#08090a] border-b border-black/[0.08] dark:border-[#1c1f23] text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-[#7e8389]">
          <div className="col-span-6">Module Scope</div>
          <div className="col-span-2 text-center">View</div>
          <div className="col-span-2 text-center">Manage</div>
          <div className="col-span-2 text-center">Delete</div>
        </div>

        {/* Matrix Rows */}
        <div className="divide-y divide-black/[0.08] dark:divide-[#1c1f23]">
          {MODULE_DEFINITIONS.map((mod) => {
            const isExpanded = Boolean(expandedModules[mod.module]);
            const perms = profile.permissions[mod.module] || { view: false, manage: false, delete: false };

            return (
              <React.Fragment key={mod.module}>
                <div className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-gray-50 dark:hover:bg-[#121417]/50 transition-colors">
                  <div className="col-span-6 flex items-center gap-2">
                    {mod.subItems && mod.subItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(mod.module)}
                        className="p-1 rounded text-gray-400 dark:text-[#7e8389] hover:text-[#101217] dark:hover:text-[#f1f2f3] transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <span className="w-5" />
                    )}

                    <div>
                      <span className="text-xs font-medium text-[#101217] dark:text-[#f1f2f3]">{mod.label}</span>
                      <span className="text-[9px] font-mono text-gray-500 dark:text-[#7e8389] ml-2 uppercase">
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
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          perms.view
                            ? 'bg-indigo-600 dark:bg-[#e6e8eb] text-white dark:text-[#0d0e10] border-indigo-600 dark:border-[#e6e8eb] shadow-sm'
                            : 'bg-white dark:bg-[#0a0b0d] border-gray-300 dark:border-[#24272b] text-gray-400 dark:text-[#7e8389] hover:border-gray-400 dark:hover:border-[#373b42]'
                        }`}
                      >
                        {perms.view ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-[#373b42] text-xs">—</span>
                    )}
                  </div>

                  {/* Manage Action Checkbox */}
                  <div className="col-span-2 flex justify-center">
                    {mod.actions.manage ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggle(mod.module, 'manage')}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          perms.manage
                            ? 'bg-indigo-600 dark:bg-[#e6e8eb] text-white dark:text-[#0d0e10] border-indigo-600 dark:border-[#e6e8eb] shadow-sm'
                            : 'bg-white dark:bg-[#0a0b0d] border-gray-300 dark:border-[#24272b] text-gray-400 dark:text-[#7e8389] hover:border-gray-400 dark:hover:border-[#373b42]'
                        }`}
                      >
                        {perms.manage ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-[#373b42] text-xs">—</span>
                    )}
                  </div>

                  {/* Delete Action Checkbox */}
                  <div className="col-span-2 flex justify-center">
                    {mod.actions.delete ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggle(mod.module, 'delete')}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          perms.delete
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white dark:bg-[#0a0b0d] border-gray-300 dark:border-[#24272b] text-gray-400 dark:text-[#7e8389] hover:border-gray-400 dark:hover:border-[#373b42]'
                        }`}
                      >
                        {perms.delete ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-[#373b42] text-xs">—</span>
                    )}
                  </div>
                </div>

                {/* Sub-items (Expandable) */}
                {isExpanded && mod.subItems && (
                  <div className="bg-gray-50 dark:bg-[#08090a] divide-y divide-black/[0.08] dark:divide-[#17191c] px-4 py-2">
                    {mod.subItems.map((sub) => (
                      <div key={sub.id} className="grid grid-cols-12 py-1.5 items-center pl-8">
                        <div className="col-span-6 text-[11px] text-gray-600 dark:text-[#a9adb2]">
                          • {sub.label}
                        </div>
                        <div className="col-span-6 text-[10px] font-mono text-gray-500 dark:text-[#7e8389]">
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

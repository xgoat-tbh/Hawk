'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

import { MODULE_DEFINITIONS, PermissionProfile, ActionType } from '@/lib/permissions';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface PermissionMatrixProps {
  profile: PermissionProfile;
  onChange: (updatedProfile: PermissionProfile) => void;
  disabled?: boolean;
}

export function PermissionMatrix({ profile, onChange, disabled = false }: PermissionMatrixProps) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const root = useRef<HTMLDivElement>(null);
  const toggleExpand = (modKey: string) => setExpandedModules(prev => ({ ...prev, [modKey]: !prev[modKey] }));

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
    <motion.div layout ref={root} className="space-y-4">
      <div className="overflow-hidden border border-black/[0.08] dark:border-border-strong rounded-md bg-white dark:bg-panel">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-gray-50 dark:bg-surface-0 border-b border-black/[0.08] dark:border-[#1c1f23] text-[10px] font-sans uppercase tracking-wider text-text-muted dark:text-text-muted">
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
                <div className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-gray-50 dark:hover:bg-surface-3/50 transition-colors">
                  <div className="col-span-6 flex items-center gap-2">
                    {mod.subItems && mod.subItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(mod.module)} aria-label={`Expand ${mod.label}`} aria-expanded={isExpanded}
                        className="p-1 rounded text-text-muted dark:text-text-muted hover:text-text-primary dark:hover:text-text-primary transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <span className="w-5" />
                    )}

                    <div>
                      <span className="text-xs font-medium text-text-primary dark:text-text-primary">{mod.label}</span>
                      <span className="text-[9px] font-sans text-text-muted dark:text-text-muted ml-2 uppercase">
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
                        onClick={() => handleToggle(mod.module, 'view')} aria-label={`${mod.label}: view`} aria-pressed={perms.view}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          perms.view
                            ? 'bg-indigo-600 dark:bg-[#e6e8eb] text-white dark:text-panel border-indigo-600 dark:border-[#e6e8eb] shadow-sm'
                            : 'bg-white dark:bg-surface-1 border-gray-300 dark:border-border-strong text-text-muted dark:text-text-muted hover:border-gray-400 dark:hover:border-[#373b42]'
                        }`}
                      >
                        {perms.view ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-text-secondary text-xs">—</span>
                    )}
                  </div>

                  {/* Manage Action Checkbox */}
                  <div className="col-span-2 flex justify-center">
                    {mod.actions.manage ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggle(mod.module, 'manage')} aria-label={`${mod.label}: manage`} aria-pressed={perms.manage}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          perms.manage
                            ? 'bg-indigo-600 dark:bg-[#e6e8eb] text-white dark:text-panel border-indigo-600 dark:border-[#e6e8eb] shadow-sm'
                            : 'bg-white dark:bg-surface-1 border-gray-300 dark:border-border-strong text-text-muted dark:text-text-muted hover:border-gray-400 dark:hover:border-[#373b42]'
                        }`}
                      >
                        {perms.manage ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-text-secondary text-xs">—</span>
                    )}
                  </div>

                  {/* Delete Action Checkbox */}
                  <div className="col-span-2 flex justify-center">
                    {mod.actions.delete ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleToggle(mod.module, 'delete')} aria-label={`${mod.label}: delete`} aria-pressed={perms.delete}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          perms.delete
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white dark:bg-surface-1 border-gray-300 dark:border-border-strong text-text-muted dark:text-text-muted hover:border-gray-400 dark:hover:border-[#373b42]'
                        }`}
                      >
                        {perms.delete ? <Check className="w-3 h-3 stroke-[3]" /> : null}
                      </button>
                    ) : (
                      <span className="text-gray-300 dark:text-text-secondary text-xs">—</span>
                    )}
                  </div>
                </div>

                {/* Sub-items (Expandable) */}
                {isExpanded && mod.subItems && (
                  <div className="bg-gray-50 dark:bg-surface-0 divide-y divide-black/[0.08] dark:divide-surface-3 px-4 py-2">
                    {mod.subItems.map((sub) => (
                      <div key={sub.id} className="grid grid-cols-12 py-1.5 items-center pl-8">
                        <div className="col-span-6 text-[11px] text-text-muted dark:text-text-secondary">
                          • {sub.label}
                        </div>
                        <div className="col-span-6 text-[10px] font-sans text-text-muted dark:text-text-muted">
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
    </motion.div>
  );
}

'use client';

import React, { useState } from 'react';
import { UserOverride, MODULE_DEFINITIONS, ActionType } from '@/lib/permissions';
import { UserPicker } from '@/components/ui/UserPicker';
import { HawkSelect } from '@/components/ui/HawkSelect';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { Plus, Trash2, User } from 'lucide-react';

interface UserOverridesListProps {
  overrides: UserOverride[];
  onSaveOverrides: (updated: UserOverride[]) => Promise<void>;
}

export function UserOverridesList({ overrides, onSaveOverrides }: UserOverridesListProps) {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [moduleKey, setModuleKey] = useState('economy');
  const [action, setAction] = useState<ActionType>('manage');
  const [effect, setEffect] = useState<'ALLOW' | 'DENY'>('ALLOW');
  const [isAdding, setIsAdding] = useState(false);

  const moduleOptions = MODULE_DEFINITIONS.map((m) => ({
    value: m.module,
    label: m.label,
  }));

  const actionOptions = [
    { value: 'view', label: 'View' },
    { value: 'manage', label: 'Manage' },
    { value: 'delete', label: 'Delete' },
  ];

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setIsAdding(true);
    try {
      const cleanId = userId.trim().replace(/[<@!>]/g, '');
      const updated: UserOverride[] = [
        ...overrides.filter(
          (o) => !(o.userId === cleanId && o.module === moduleKey && o.action === action)
        ),
        {
          userId: cleanId,
          userName: userName.trim() || `User ${cleanId.slice(-4)}`,
          module: moduleKey,
          action,
          effect,
        },
      ];
      await onSaveOverrides(updated);
      setUserId('');
      setUserName('');
    } catch (err) {
      console.error('Failed to add user override:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveOverride = async (index: number) => {
    const updated = overrides.filter((_, i) => i !== index);
    await onSaveOverrides(updated);
  };

  return (
    <div className="space-y-4">
      {/* Create User Override Form */}
      <form
        onSubmit={handleAddOverride}
        className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-4 space-y-1">
          <label className="text-[10px] font-mono uppercase text-[#7e8389]">Discord User</label>
          <UserPicker
            value={userId}
            onChange={(id, name) => {
              setUserId(id);
              if (name) setUserName(name);
            }}
            placeholder="Select or paste User ID..."
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-[#7e8389]">Target Module</label>
          <HawkSelect
            options={moduleOptions}
            value={moduleKey}
            onChange={setModuleKey}
            placeholder="Select module..."
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="text-[10px] font-mono uppercase text-[#7e8389]">Action</label>
          <HawkSelect
            options={actionOptions}
            value={action}
            onChange={(val) => setAction(val as ActionType)}
            placeholder="Select action..."
            searchable={false}
          />
        </div>

        <div className="sm:col-span-3 flex items-center gap-2">
          <div className="flex bg-[#0a0b0d] p-0.5 rounded-md border border-[#24272b] flex-1">
            <button
              type="button"
              onClick={() => setEffect('ALLOW')}
              className={`flex-1 py-1.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                effect === 'ALLOW' ? 'bg-success text-black' : 'text-[#7e8389]'
              }`}
            >
              ALLOW
            </button>
            <button
              type="button"
              onClick={() => setEffect('DENY')}
              className={`flex-1 py-1.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                effect === 'DENY' ? 'bg-critical text-white' : 'text-[#7e8389]'
              }`}
            >
              DENY
            </button>
          </div>

          <button
            type="submit"
            disabled={isAdding || !userId.trim()}
            className="btn-primary py-2 px-3 text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Overrides Table with HawkScrollArea */}
      <div className="border border-[#24272b] rounded-md overflow-hidden bg-[#0d0e10]">
        <HawkScrollArea maxHeight="45vh">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#1c1f23] text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
              <tr>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Module Scope</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Override Effect</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1f23]">
              {overrides.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#7e8389] text-xs">
                    No individual user overrides configured. Permissions follow role policies.
                  </td>
                </tr>
              ) : (
                overrides.map((o, idx) => (
                  <tr key={`${o.userId}-${o.module}-${o.action}`} className="hover:bg-[#121417]/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#7e8389]" />
                        <div>
                          <div className="font-medium text-[#f1f2f3]">{o.userName}</div>
                          <div className="text-[10px] font-mono text-[#7e8389]">{o.userId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[#f1f2f3] capitalize">{o.module}</span>
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="text-[10px] font-mono uppercase text-[#d5d7da] bg-[#17191c] px-1.5 py-0.5 rounded border border-[#24272b]">
                        {o.action}
                      </span>
                    </td>

                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                          o.effect === 'ALLOW'
                            ? 'bg-success-soft text-success-text border-success-border'
                            : 'bg-critical-soft text-critical-text border-critical-border'
                        }`}
                      >
                        {o.effect}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(idx)}
                        className="p-1.5 rounded-md text-[#7e8389] hover:text-critical-text hover:bg-critical-soft transition-colors"
                        title="Delete override"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </HawkScrollArea>
      </div>
    </div>
  );
}

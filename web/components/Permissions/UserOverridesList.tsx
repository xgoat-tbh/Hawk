'use client';

import React, { useState } from 'react';
import { UserOverride, MODULE_DEFINITIONS, ActionType } from '@/lib/permissions';
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
        className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Discord User ID</label>
          <input
            type="text"
            required
            placeholder="1293525264650997842"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="glass-input font-mono text-xs"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">User Label</label>
          <input
            type="text"
            placeholder="Alex"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="glass-input font-sans text-xs"
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Target Module</label>
          <select
            value={moduleKey}
            onChange={(e) => setModuleKey(e.target.value)}
            className="glass-input font-sans text-xs"
          >
            {MODULE_DEFINITIONS.map((m) => (
              <option key={m.module} value={m.module} className="bg-[#0a0a0c] text-white">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as ActionType)}
            className="glass-input font-sans text-xs"
          >
            <option value="view" className="bg-[#0a0a0c] text-white">View</option>
            <option value="manage" className="bg-[#0a0a0c] text-white">Manage</option>
            <option value="delete" className="bg-[#0a0a0c] text-white">Delete</option>
          </select>
        </div>

        <div className="sm:col-span-2 flex items-center gap-2">
          <div className="flex bg-[#050507] p-0.5 rounded-lg border border-white/[0.08] flex-1">
            <button
              type="button"
              onClick={() => setEffect('ALLOW')}
              className={`flex-1 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
                effect === 'ALLOW' ? 'bg-emerald-500 text-black' : 'text-white/40'
              }`}
            >
              ALLOW
            </button>
            <button
              type="button"
              onClick={() => setEffect('DENY')}
              className={`flex-1 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
                effect === 'DENY' ? 'bg-red-500 text-white' : 'text-white/40'
              }`}
            >
              DENY
            </button>
          </div>

          <button
            type="submit"
            disabled={isAdding}
            className="btn-primary py-2 px-3 text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Overrides Table (Internal Scroll) */}
      <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#08080a]">
        <div className="max-h-[50vh] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#0d0d10] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-white/40">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Module Scope</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Override Effect</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {overrides.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white/30 text-xs">
                    No individual user overrides configured. Permissions follow role policies.
                  </td>
                </tr>
              ) : (
                overrides.map((o, idx) => (
                  <tr key={`${o.userId}-${o.module}-${o.action}`} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-white/50" />
                        <div>
                          <div className="font-medium text-white">{o.userName}</div>
                          <div className="text-[10px] font-mono text-white/30">{o.userId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-white capitalize">{o.module}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono uppercase text-white/70 bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {o.action}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                          o.effect === 'ALLOW'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {o.effect}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(idx)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition-colors"
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
        </div>
      </div>
    </div>
  );
}

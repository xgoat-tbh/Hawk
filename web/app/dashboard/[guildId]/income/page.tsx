'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { useGuildData } from '@/context/GuildContext';
import { Briefcase, Plus, Trash2, Coins, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function IncomeRolesPage() {
  const { guildId } = useParams() as { guildId: string };
  const { roles, config, refreshData } = useGuildData();

  const incomeRoles = config?.incomeRoles || [];
  const currencySymbol = config?.economy?.currency_symbol || '$';

  const [newRoleId, setNewRoleId] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState('500');
  const [isAdding, setIsAdding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleId || !newAmount) {
      setActionError('Please select a role and enter an income amount.');
      return;
    }

    setIsAdding(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'income_add_role',
          data: {
            role_id: newRoleId,
            income_amount: parseInt(newAmount, 10) || 0,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to assign income role');

      setNewRoleId(null);
      setNewAmount('500');
      setActionSuccess('Role income reward configured.');
      await refreshData();
    } catch (err: any) {
      setActionError(err.message || 'Error adding income role');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'income_delete_role',
          data: { role_id: roleId },
        }),
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to delete income role:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-white/80" />
            <span>Role Income & Salaries</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Configure periodic wage payouts granted automatically to members holding specific roles.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Add Income Role (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Assign Role Salary</h3>
              <p className="text-[11px] text-white/40">Set the payout amount granted for having a role.</p>
            </div>
          </div>

          <form onSubmit={handleAddRole} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Target Role</label>
              <RoleSelect
                roles={roles}
                value={newRoleId}
                onChange={setNewRoleId}
                placeholder="Select role..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Periodic Income ({currencySymbol})</label>
              <input
                type="number"
                min={1}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="glass-input font-mono text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Save Role Salary</span>
            </button>
          </form>
        </div>

        {/* Right: Existing Income Roles (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Active Role Salaries ({incomeRoles.length})
            </span>
          </div>

          {incomeRoles.length === 0 ? (
            <div className="glass-card p-10 text-center text-xs text-white/30">
              No role salaries configured yet. Select a role and specify a payout amount on the left.
            </div>
          ) : (
            <div className="space-y-2.5">
              {incomeRoles.map((item: any) => {
                const targetRole = roles.find((r) => r.id === item.role_id);
                return (
                  <div
                    key={item.role_id}
                    className="glass-card p-4 flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-white/60 shrink-0" />
                        <span className="font-medium text-xs text-white truncate">
                          @{targetRole?.name || `Role ${item.role_id}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-white/60 pt-0.5 font-mono">
                        <Coins className="w-3 h-3 text-white/40" />
                        <span>{currencySymbol}{item.income_amount?.toLocaleString()} per payout cycle</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRole(item.role_id)}
                      className="btn-outline-danger p-2 shrink-0"
                      title="Delete role salary"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
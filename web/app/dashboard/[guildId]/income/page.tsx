'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { SyncLoader } from '@/components/SyncLoader';
import { Briefcase, Plus, Trash2, Coins, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export default function IncomeRolesPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [incomeRoles, setIncomeRoles] = useState<any[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  const [newRoleId, setNewRoleId] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState('500');
  const [isAdding, setIsAdding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch(`/api/guilds/${guildId}`);
      const data = await res.json();
      setRoles(data.roles || []);
      setIncomeRoles(data.config?.incomeRoles || []);
      setCurrencySymbol(data.config?.economy?.currency_symbol || '$');
    } catch (err) {
      console.error('Failed to load income roles:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [guildId]);

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
      await loadData();
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
      await loadData();
    } catch (err) {
      console.error('Failed to delete income role:', err);
    }
  };

  if (loading) {
    return <SyncLoader title="Syncing Role Income Multipliers" subtitle="Fetching automatic periodic rewards mapped to server roles..." />;
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <Briefcase className="w-6 h-6 text-[#5865F2]" />
          <span>Role Income & Salaries</span>
        </h1>
        <p className="text-xs text-white/50 mt-1 font-medium">
          Automatically award periodic salary payouts to server members holding specific booster, VIP, or staff roles.
        </p>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Add Form */}
        <form onSubmit={handleAddRole} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Assign Income Role</h3>
                <p className="text-xs text-white/40">Set the periodic payout amount for this role.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="btn-outline-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Adding...' : 'Assign Role'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Target Role</label>
              <RoleSelect
                roles={roles}
                value={newRoleId}
                onChange={setNewRoleId}
                placeholder="Select role..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Salary Payout ({currencySymbol})</label>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="500"
                className="glass-input font-mono text-xs"
              />
            </div>
          </div>
        </form>

        {/* Existing Income Roles */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                Configured Income Roles ({incomeRoles.length})
              </h3>
              <p className="text-xs text-white/40">Members holding these roles receive automated income deposits.</p>
            </div>
          </div>

          {incomeRoles.length === 0 ? (
            <div className="text-center py-12 text-xs text-white/30">
              No income roles assigned yet. Use the form above or Discord <code className="text-[#5865F2] font-mono">!incomeadd</code>.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {incomeRoles.map((item) => {
                const targetRole = roles.find((r) => r.id === item.role_id);
                return (
                  <div key={item.role_id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-300 font-semibold text-xs flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>@{targetRole ? targetRole.name : item.role_id}</span>
                      </span>
                      <span className="text-white/20">→</span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" />
                        <span>+{item.income_amount} {currencySymbol}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRole(item.role_id)}
                      className="btn-outline-danger"
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
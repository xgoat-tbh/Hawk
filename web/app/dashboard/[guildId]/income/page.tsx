'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useGuildData } from '@/context/GuildContext';
import { Briefcase, Plus, Trash2, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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
      setActionSuccess('Role salary assigned successfully.');
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
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Assign Salary Form Bar */}
      <form
        onSubmit={handleAddRole}
        className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-6 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Target Role</label>
          <RoleSelect
            roles={roles}
            value={newRoleId}
            onChange={setNewRoleId}
            placeholder="Select Discord role..."
          />
        </div>

        <div className="sm:col-span-4 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Periodic Income ({currencySymbol})</label>
          <input
            type="number"
            min={1}
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="glass-input font-mono text-xs"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isAdding}
            className="btn-primary w-full py-2 flex items-center justify-center gap-1.5 text-xs shrink-0"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Assign Salary</span>
          </button>
        </div>
      </form>

      {/* Salaries Data Table (with Independent Internal Scroll) */}
      <div className="space-y-2">
        <SectionHeader
          title={`Active Role Salaries (${incomeRoles.length})`}
          description="Members holding these roles receive automated wallet payouts per reward cycle."
        />

        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#08080a]">
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#0d0d10] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Payout Amount</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {incomeRoles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-white/30 text-xs">
                      No role salaries configured yet. Select a role and specify a payout amount above.
                    </td>
                  </tr>
                ) : (
                  incomeRoles.map((item: any) => {
                    const targetRole = roles.find((r) => r.id === item.role_id);
                    return (
                      <tr key={item.role_id} className="hover:bg-white/[0.015] transition-colors">
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-white font-medium">
                            <Shield className="w-3.5 h-3.5 text-white/40" />
                            <span>@{targetRole?.name || `Role ${item.role_id}`}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium text-emerald-400">
                          +{currencySymbol}{item.income_amount?.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 text-[11px] font-mono text-white/50">
                          Automated Cycle
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(item.role_id)}
                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors"
                            title="Revoke salary"
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
          </div>
        </div>
      </div>
    </div>
  );
}
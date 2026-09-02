'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RolePicker } from '@/components/ui/RolePicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { Briefcase, Plus, Trash2, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function IncomeRolesPage() {
  const { guildId } = useParams() as { guildId: string };
  const containerRef = usePageEntrance();
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
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#a9adb2]" />
            <span>Role Income & Salaries</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
            Configure periodic wage payouts granted automatically to members holding specific roles.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-md bg-success-soft border border-success-border flex items-center gap-2 text-xs text-success-text">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-md bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 text-critical shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Assign Salary Form Bar */}
      <form
        onSubmit={handleAddRole}
        className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-6 space-y-1">
          <label className="text-[10px] font-mono uppercase text-[#7e8389]">Target Role</label>
          <RolePicker
            roles={roles}
            value={newRoleId}
            onChange={setNewRoleId}
            placeholder="Select Discord role..."
          />
        </div>

        <div className="sm:col-span-4 space-y-1">
          <label className="text-[10px] font-mono uppercase text-[#7e8389]">Periodic Income ({currencySymbol})</label>
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

      {/* Salaries Data Table with HawkScrollArea */}
      <div className="space-y-2" data-animate-section>
        <SectionHeader
          title={`Active Role Salaries (${incomeRoles.length})`}
          description="Members holding these roles receive automated wallet payouts per reward cycle."
        />

        <div className="border border-[#24272b] rounded-md overflow-hidden bg-[#0d0e10]">
          <HawkScrollArea maxHeight="50vh">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#1c1f23] text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
                <tr>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Payout Amount</th>
                  <th className="py-2.5 px-4">Frequency</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1f23]">
                {incomeRoles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#7e8389] text-xs">
                      No role salaries configured yet. Select a role and specify a payout amount above.
                    </td>
                  </tr>
                ) : (
                  incomeRoles.map((item: any) => {
                    const targetRole = roles.find((r) => r.id === item.role_id);
                    return (
                      <tr key={item.role_id} className="hover:bg-[#121417]/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#f1f2f3] font-medium">
                            <Shield className="w-3.5 h-3.5 text-[#7e8389]" />
                            <span>@{targetRole?.name || `Role ${item.role_id}`}</span>
                          </span>
                        </td>

                        <td className="py-2.5 px-4 font-mono font-medium text-success-text">
                          +{currencySymbol}{item.income_amount?.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-4 text-[11px] font-mono text-[#7e8389]">
                          Automated Cycle
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(item.role_id)}
                            className="p-1.5 rounded-md text-[#7e8389] hover:text-critical-text hover:bg-critical-soft transition-colors"
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
          </HawkScrollArea>
        </div>
      </div>
    </div>
  );
}
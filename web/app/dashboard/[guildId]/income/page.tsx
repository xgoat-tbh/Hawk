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
  const { roles, config, refreshData, loading } = useGuildData();
  const containerRef = usePageEntrance(!loading);

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
      setTimeout(() => setActionSuccess(null), 4000);
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
      setActionSuccess('Role salary removed.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to delete role salary:', err);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17191c] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#ededed] tracking-tight flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#949aa2]" />
            <span>Role Income & Salaries</span>
          </h1>
          <p className="text-xs text-[#6e747c] mt-0.5">
            Grant automated recurring currency payouts to members holding designated staff or VIP roles.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-success-soft border border-success-border flex items-center gap-2 text-xs text-success-text">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-lg bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 text-critical shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Add New Income Role Surface */}
      <form
        onSubmit={handleAddRole}
        className="p-4 sm:p-5 rounded-lg bg-[#0d0e10] border border-[#1f2226] space-y-4 shadow-sm"
        data-animate-section
      >
        <SectionHeader
          title="Assign Role Salary"
          description="Select a server role and designate its recurring payout."
          icon={<Plus className="w-3.5 h-3.5 text-[#6e747c]" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
          <div className="sm:col-span-6 space-y-1">
            <label className="text-xs font-medium text-[#ededed]">Target Discord Role</label>
            <RolePicker
              roles={roles}
              value={newRoleId}
              onChange={setNewRoleId}
              placeholder="Select server role..."
            />
          </div>

          <div className="sm:col-span-4 space-y-1">
            <label className="text-xs font-medium text-[#ededed]">Income Amount ({currencySymbol})</label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#6e747c]">{currencySymbol}</span>
              <input
                type="number"
                min={1}
                max={1000000000}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="500"
                className="glass-input font-mono text-xs w-full"
                required
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isAdding || !newRoleId}
              className="btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1.5"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Assign</span>
            </button>
          </div>
        </div>
      </form>

      {/* Assigned Income Roles Table */}
      <div className="space-y-3" data-animate-section>
        <SectionHeader
          title={`Active Role Salaries (${incomeRoles.length})`}
          description="Members holding any of these roles receive regular payouts when active."
        />

        <div className="border border-[#1f2226] rounded-lg overflow-hidden bg-[#0d0e10] shadow-sm">
          <HawkScrollArea maxHeight="420px">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#17191c] text-[10px] font-mono uppercase tracking-wider text-[#6e747c]">
                <tr>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Salary Amount</th>
                  <th className="py-2.5 px-4">Role ID</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17191c]">
                {incomeRoles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-[#6e747c] text-xs">
                      No role salaries configured. Select a role above to assign income.
                    </td>
                  </tr>
                ) : (
                  incomeRoles.map((item: any) => {
                    const role = roles.find((r) => r.id === item.role_id);
                    return (
                      <tr key={item.role_id} className="hover:bg-[#121417]/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-[#ededed]">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#121417] border border-[#1f2226]">
                            <Shield className="w-3 h-3 text-[#949aa2]" />
                            <span>@{role ? role.name : item.role_id}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-success-text">
                          +{currencySymbol}
                          {Number(item.income_amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#6e747c]">
                          {item.role_id}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(item.role_id)}
                            className="p-1 rounded text-[#6e747c] hover:text-critical-text hover:bg-critical-soft transition-colors"
                            title="Remove Salary"
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
'use client';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RolePicker } from '@/components/ui/RolePicker';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useGuildData } from '@/context/GuildContext';
import { useToast } from '@/components/ui/Toast';
import {
  Briefcase,
  Plus,
  Trash2,
  Shield,
  Coins,
  Clock,
  TrendingUp,
  RefreshCw,
  Loader2,
  Sliders,
} from 'lucide-react';

interface IncomeRoleItem {
  role_id: string;
  income_amount: number;
}

export default function IncomeRolesPage() {
  const { guildId } = useParams() as { guildId: string };
  const { roles, config, refreshData, updateConfigLocally } = useGuildData();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'salaries' | 'assign' | 'cadence'>('salaries');

  const incomeRoles: IncomeRoleItem[] = config?.incomeRoles || [];
  const currencySymbol = config?.economy?.currency_symbol || '$';
  const currentInterval = config?.economy?.income_reset || '24h';

  const [newRoleId, setNewRoleId] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState('500');
  const [isAdding, setIsAdding] = useState(false);

  const [cadence, setCadence] = useState<string>(currentInterval);
  const [savingCadence, setSavingCadence] = useState(false);

  const totalPool = incomeRoles.reduce((acc, r) => acc + (Number(r.income_amount) || 0), 0);
  const maxSalary = incomeRoles.length > 0 ? Math.max(...incomeRoles.map((r) => Number(r.income_amount) || 0)) : 0;

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleId || !newAmount) {
      toast.error('Select role and specify payout amount');
      return;
    }

    setIsAdding(true);

    try {
      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
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
      toast.success('Role salary assigned successfully.');
      await refreshData();
      setActiveTab('salaries');
    } catch (err: any) {
      toast.error(err.message || 'Error adding income role');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const response = await apiFetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'income_delete_role',
          data: { role_id: roleId },
        }),
      });
      if (!response.ok) throw new Error('Failed to delete role salary');
      await refreshData();
      toast.success('Role salary removed.');
    } catch {
      toast.error('Failed to delete role salary');
    }
  };

  const handleSaveCadence = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCadence(true);
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'economy',
          data: {
            income_reset: cadence,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to update payout interval');
      const result = await res.json();
      updateConfigLocally('economy', result.data);
      toast.success('Payout interval updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Error saving payout interval');
    } finally {
      setSavingCadence(false);
    }
  };

  const roleColumns: Column<IncomeRoleItem>[] = [
    {
      key: 'role',
      header: 'Role',
      render: (row) => {
        const role = roles.find((r) => r.id === row.role_id);
        return (
          <div className="flex items-center gap-1.5 font-sans text-xs text-text-primary">
            <Shield className="w-3.5 h-3.5 text-info-text" />
            <span>@{role ? role.name : row.role_id}</span>
          </div>
        );
      },
    },
    {
      key: 'salary',
      header: 'Salary Amount',
      render: (row) => (
        <span className="font-sans text-xs font-semibold text-success-text">
          +{currencySymbol}{Number(row.income_amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'roleId',
      header: 'Role ID',
      render: (row) => (
        <span className="font-sans text-xs text-text-secondary">{row.role_id}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleDeleteRole(row.role_id)}
          className="btn-outline-danger py-1 px-2 text-[11px] font-sans"
          title="Remove Salary"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          remove
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-24">
      <PageHeader guildId={guildId} title="Role salaries" description="Schedule recurring payouts for members with designated roles." actions={<button
            type="button"
            onClick={() => {
              refreshData();
            }}
            className="btn-secondary font-sans"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </button>}/>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Configured Roles</span>
            <span className="console-tag console-tag-readv">ROLES</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-text-primary tracking-tight">
            {incomeRoles.length}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            active salary tiers
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Max Salary</span>
            <span className="console-tag console-tag-economy">TOP</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-success-text tracking-tight">
            +{currencySymbol}{maxSalary.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            highest single payout
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Total Pool</span>
            <span className="console-tag console-tag-economy">SUM</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-text-primary tracking-tight">
            +{currencySymbol}{totalPool.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            per cycle allocation
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Payout Cadence</span>
            <span className="console-tag console-tag-readv">TIMER</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-text-primary tracking-tight">
            {currentInterval}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            automated schedule
          </div>
        </div>
      </div>

      {/* Terminal Tab Strip */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-2 text-xs font-sans">
        <button
          onClick={() => setActiveTab('salaries')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'salaries'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>active salaries ({incomeRoles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assign')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'assign'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ assign role salary</span>
        </button>

        <button
          onClick={() => setActiveTab('cadence')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'cadence'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>payout interval</span>
        </button>
      </div>

      {/* TAB 1: Active Salaries */}
      {activeTab === 'salaries' && (
        <div className="surface-container">
          <div className="panel-header">
            <span>role salary allocations</span>
            <span className="text-text-secondary">{incomeRoles.length} configured</span>
          </div>
          <DataTable
            columns={roleColumns}
            data={incomeRoles}
            pageSize={10}
            emptyMessage="No role salaries configured. Switch to tab to assign one."
            rowKey={(r) => r.role_id}
          />
        </div>
      )}

      {/* TAB 2: Assign Role Salary */}
      {activeTab === 'assign' && (
        <div className="surface-container p-4 space-y-4 font-sans max-w-2xl">
          <div className="panel-header -mx-4 -mt-4 mb-4">
            <span>assign role salary</span>
          </div>

          <form onSubmit={handleAddRole} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-text-primary font-semibold block">Target Discord Role</label>
              <div className="text-[11px] text-text-secondary">Members possessing this role receive automated recurring payouts.</div>
              <div className="pt-1 w-full max-w-md">
                <RolePicker
                  roles={roles}
                  value={newRoleId}
                  onChange={setNewRoleId}
                  placeholder="Select server role..."
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-text-primary font-semibold block">Income Amount ({currencySymbol})</label>
              <div className="text-[11px] text-text-secondary">Amount deposited directly into member's wallet each interval.</div>
              <div className="pt-1 flex items-center gap-2 w-full max-w-xs">
                <span className="text-xs font-sans text-text-secondary">{currencySymbol}</span>
                <input
                  type="number"
                  min={1}
                  max={1000000000}
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="500"
                  className="glass-input font-sans text-right"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex justify-end">
              <button
                type="submit"
                disabled={isAdding || !newRoleId}
                className="btn-primary"
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                )}
                <span>+ [assign salary]</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Payout Interval Config */}
      {activeTab === 'cadence' && (
        <div className="surface-container p-4 space-y-4 font-sans max-w-2xl">
          <div className="panel-header -mx-4 -mt-4 mb-4">
            <span>automated payout interval</span>
          </div>

          <form onSubmit={handleSaveCadence} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-text-primary font-semibold block">Payout Frequency</label>
              <div className="text-[11px] text-text-secondary">Specifies how often automated salaries are disbursed to qualifying members.</div>
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-md">
                {['1h', '6h', '12h', '24h', '48h', '7d'].map((intervalOption) => (
                  <button
                    key={intervalOption}
                    type="button"
                    onClick={() => setCadence(intervalOption)}
                    className={`py-2 px-3 rounded-md text-xs font-sans text-center border transition-colors ${
                      cadence === intervalOption
                        ? 'bg-surface-4 text-success-text border-success/40 font-bold'
                        : 'bg-surface-1 text-text-secondary border-white/[0.06] hover:text-text-primary hover:border-white/[0.12]'
                    }`}
                  >
                    {intervalOption}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex justify-end">
              <button
                type="submit"
                disabled={savingCadence}
                className="btn-primary"
              >
                {savingCadence ? 'saving...' : 'save interval'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
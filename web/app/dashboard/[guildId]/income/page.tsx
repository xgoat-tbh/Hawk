'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RolePicker } from '@/components/ui/RolePicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { StatCard } from '@/components/ui/StatCard';
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
} from 'lucide-react';

interface IncomeRoleItem {
  role_id: string;
  income_amount: number;
}

export default function IncomeRolesPage() {
  const { guildId } = useParams() as { guildId: string };
  const { roles, config, refreshData } = useGuildData();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'salaries' | 'assign'>('salaries');

  const incomeRoles: IncomeRoleItem[] = config?.incomeRoles || [];
  const currencySymbol = config?.economy?.currency_symbol || '$';

  const [newRoleId, setNewRoleId] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState('500');
  const [isAdding, setIsAdding] = useState(false);

  const totalPool = incomeRoles.reduce((acc, r) => acc + (Number(r.income_amount) || 0), 0);
  const maxSalary = incomeRoles.length > 0 ? Math.max(...incomeRoles.map((r) => Number(r.income_amount) || 0)) : 0;

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleId || !newAmount) {
      toast.error('Please select a role and enter an income amount.');
      return;
    }

    setIsAdding(true);

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
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'income_delete_role',
          data: { role_id: roleId },
        }),
      });
      await refreshData();
      toast.success('Role salary removed.');
    } catch {
      toast.error('Failed to delete role salary');
    }
  };

  const roleColumns: Column<IncomeRoleItem>[] = [
    {
      key: 'role',
      header: 'Role',
      render: (row) => {
        const role = roles.find((r) => r.id === row.role_id);
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#14161b] border border-[#20242c] text-white">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>@{role ? role.name : row.role_id}</span>
          </span>
        );
      },
    },
    {
      key: 'salary',
      header: 'Salary Amount',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-emerald-400">
          +{currencySymbol}{Number(row.income_amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'roleId',
      header: 'Role ID',
      render: (row) => (
        <span className="font-mono text-xs text-[#717882]">{row.role_id}</span>
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
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
          title="Remove Salary"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0f2f5] flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            Role Salaries & Income
          </h1>
          <p className="mt-1 text-xs text-[#8c949e]">
            Grant automated recurring currency payouts to members holding designated staff or VIP roles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            refreshData();
            toast.info('Role income data refreshed.');
          }}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14161b] hover:bg-[#1c1f26] border border-[#20242c] text-[#c1c7cd] hover:text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh State
        </button>
      </div>

      {/* StatCards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Configured Roles"
          value={incomeRoles.length}
          subtitle="Roles receiving periodic payouts"
          icon={Briefcase}
        />
        <StatCard
          title="Max Salary"
          value={`${currencySymbol}${maxSalary.toLocaleString()}`}
          subtitle="Highest single role allocation"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Pool"
          value={`${currencySymbol}${totalPool.toLocaleString()}`}
          subtitle="Sum of active role salaries"
          icon={Coins}
        />
        <StatCard
          title="Payout Cadence"
          value={config?.economy?.income_reset || '24h'}
          subtitle="Automated payment cycle"
          icon={Clock}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('salaries')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'salaries'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Active Salaries ({incomeRoles.length})
        </button>

        <button
          onClick={() => setActiveTab('assign')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'assign'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Plus className="w-4 h-4" />
          Assign Role Salary
        </button>
      </div>

      {/* TAB 1: Active Salaries */}
      {activeTab === 'salaries' && (
        <div className="space-y-4">
          <DataTable
            columns={roleColumns}
            data={incomeRoles}
            pageSize={10}
            emptyMessage="No role salaries configured. Click 'Assign Role Salary' to create one."
            rowKey={(r) => r.role_id}
          />
        </div>
      )}

      {/* TAB 2: Assign Role Salary */}
      {activeTab === 'assign' && (
        <form onSubmit={handleAddRole} className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="Assign Role Salary"
            description="Select a server role and designate its recurring payout."
          />

          <SettingRow
            label="Target Discord Role"
            description="Members holding this role will receive periodic currency deposits."
          >
            <div className="w-64">
              <RolePicker
                roles={roles}
                value={newRoleId}
                onChange={setNewRoleId}
                placeholder="Select server role..."
              />
            </div>
          </SettingRow>

          <SettingRow
            label={`Income Amount (${currencySymbol})`}
            description="Currency amount paid out each automated cycle."
          >
            <div className="w-48 flex items-center gap-2">
              <span className="text-xs font-mono text-[#6e747c]">{currencySymbol}</span>
              <input
                type="number"
                min={1}
                max={1000000000}
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="500"
                className="bg-[#14161b] border border-[#20242c] rounded-lg px-3 py-1.5 font-mono text-xs w-full text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </SettingRow>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isAdding || !newRoleId}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2 transition-colors"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Assign Salary</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Coins,
  Wallet,
  Landmark,
  Users,
  Trophy,
  History,
  Settings,
  RotateCcw,
  Edit2,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useToast } from '@/components/ui/Toast';
import { usePolling } from '@/hooks/usePolling';

interface EconomyStats {
  currencySymbol: string;
  totalAccounts: number;
  totalCash: number;
  totalBank: number;
  totalNetWorth: number;
  avgNetWorth: number;
}

interface UserBalanceRecord {
  userId: string;
  cash: number;
  bank: number;
  bankCapacity: number;
  netWorth: number;
  updatedAt: string;
}

interface LeaderboardRecord {
  userId: string;
  cash: number;
  bank: number;
  netWorth: number;
  rank: number;
}

interface TransactionRecord {
  id: number;
  userId: string;
  actionType: string;
  amount: number;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  createdAt: string;
}

interface EconomyFormData {
  currencySymbol: string;
  startBalance: number;
  dailyRewardAmount: number;
  dailyStreakBonus: number;
  passiveIncome: boolean;
  passiveAmount: number;
}

export default function EconomyDashboardPage() {
  const { guildId } = useParams() as { guildId: string };
  const { config, updateConfigLocally } = useGuildData();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'config' | 'balances' | 'leaderboard' | 'transactions'>('balances');

  // Stats state
  const [stats, setStats] = useState<EconomyStats>({
    currencySymbol: '$',
    totalAccounts: 0,
    totalCash: 0,
    totalBank: 0,
    totalNetWorth: 0,
    avgNetWorth: 0,
  });

  // User balances state
  const [userBalances, setUserBalances] = useState<UserBalanceRecord[]>([]);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);

  // Transactions state
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Edit Balance Modal State
  const [editUser, setEditUser] = useState<UserBalanceRecord | null>(null);
  const [editCash, setEditCash] = useState<number>(0);
  const [editBank, setEditBank] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);

  // Confirm Modal State
  const [resetTargetUser, setResetTargetUser] = useState<string | null>(null);
  const [isResetAllOpen, setIsResetAllOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch Summary Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/economy/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [guildId]);

  // Fetch Balances
  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/economy/users`);
      if (res.ok) {
        const data = await res.json();
        setUserBalances(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  }, [guildId]);

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/economy/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, [guildId]);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/economy/transactions`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  }, [guildId]);

  // Live polling for stats every 10s
  usePolling(fetchStats, { intervalMs: 10000 });

  useEffect(() => {
    fetchStats();
    if (activeTab === 'balances') fetchBalances();
    if (activeTab === 'leaderboard') fetchLeaderboard();
    if (activeTab === 'transactions') fetchTransactions();
  }, [activeTab, fetchStats, fetchBalances, fetchLeaderboard, fetchTransactions]);

  // Configuration Form Draft
  const initialFormData = useMemo<EconomyFormData>(() => {
    const eco = config?.economy || {};
    return {
      currencySymbol: eco.currency_symbol || '$',
      startBalance: Number(eco.start_balance) || 0,
      dailyRewardAmount: Number(eco.daily_reward_amount) || 1000,
      dailyStreakBonus: Number(eco.daily_streak_bonus) || 100,
      passiveIncome: Boolean(eco.passive_income),
      passiveAmount: Number(eco.passive_amount) || 10,
    };
  }, [config?.economy]);

  const {
    draft,
    isDirty,
    saveState,
    error: saveError,
    setField,
    reset,
    save,
  } = useFormDraft<EconomyFormData>({
    initialData: initialFormData,
    onSave: async (formValues) => {
      const payload = {
        currency_symbol: formValues.currencySymbol.trim() || '$',
        start_balance: formValues.startBalance,
        daily_reward_amount: formValues.dailyRewardAmount,
        daily_streak_bonus: formValues.dailyStreakBonus,
        passive_income: formValues.passiveIncome,
        passiveAmount: formValues.passiveAmount,
      };

      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'economy', data: payload }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save configuration');
      }

      const result = await res.json();
      updateConfigLocally('economy', result.data);
      toast.success('Economy settings updated successfully!');
      fetchStats();
    },
  });

  // Handle Save User Balance Edit
  const handleSaveUserBalance = async () => {
    if (!editUser) return;
    setIsEditing(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/economy/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_balance',
          userId: editUser.userId,
          cash: editCash,
          bank: editBank,
        }),
      });
      if (res.ok) {
        toast.success(`Updated balance for user ${editUser.userId}`);
        setEditUser(null);
        fetchBalances();
        fetchStats();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update balance');
      }
    } catch {
      toast.error('Network error updating balance');
    } finally {
      setIsEditing(false);
    }
  };

  // Handle Reset Single User Balance
  const handleConfirmResetUser = async () => {
    if (!resetTargetUser) return;
    setModalLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/economy/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_user',
          userId: resetTargetUser,
        }),
      });
      if (res.ok) {
        toast.success(`Reset balance for user ${resetTargetUser}`);
        setResetTargetUser(null);
        fetchBalances();
        fetchStats();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to reset balance');
      }
    } catch {
      toast.error('Network error resetting balance');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Reset All Server Balances
  const handleConfirmResetAll = async () => {
    setModalLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/economy/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_all' }),
      });
      if (res.ok) {
        toast.success('All server economy balances have been reset to 0.');
        setIsResetAllOpen(false);
        fetchBalances();
        fetchStats();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to reset all balances');
      }
    } catch {
      toast.error('Network error resetting all balances');
    } finally {
      setModalLoading(false);
    }
  };

  // Columns for User Balances Table
  const balanceColumns: Column<UserBalanceRecord>[] = [
    {
      key: 'userId',
      header: 'User ID',
      sortable: true,
      render: (row) => (
        <div className="font-mono text-xs text-[#101217] dark:text-[#ededed] flex items-center gap-2">
          <span>{row.userId}</span>
        </div>
      ),
    },
    {
      key: 'cash',
      header: 'Wallet Cash',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {stats.currencySymbol}{row.cash.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'bank',
      header: 'Bank Balance',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
          {stats.currencySymbol}{row.bank.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'netWorth',
      header: 'Net Worth',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-[#101217] dark:text-[#f0f2f5]">
          {stats.currencySymbol}{row.netWorth.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setEditUser(row);
              setEditCash(row.cash);
              setEditBank(row.bank);
            }}
            className="p-1.5 rounded-lg bg-white dark:bg-[#16181d] hover:bg-slate-100 dark:hover:bg-[#20232b] text-[#101217] dark:text-[#c1c7cd] hover:text-black dark:hover:text-white border border-black/[0.08] dark:border-[#262a33] shadow-xs transition-colors"
            title="Edit balance"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setResetTargetUser(row.userId)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors"
            title="Reset balance"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Columns for Leaderboard Table
  const leaderboardColumns: Column<LeaderboardRecord>[] = [
    {
      key: 'rank',
      header: 'Rank',
      sortable: true,
      width: 'w-16',
      render: (row) => {
        let badge = `#${row.rank}`;
        if (row.rank === 1) badge = '🥇 1st';
        if (row.rank === 2) badge = '🥈 2nd';
        if (row.rank === 3) badge = '🥉 3rd';
        return <span className="font-bold text-xs text-[#101217] dark:text-[#ededed]">{badge}</span>;
      },
    },
    {
      key: 'userId',
      header: 'User Snowflake',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-slate-600 dark:text-[#c1c7cd]">{row.userId}</span>,
    },
    {
      key: 'cash',
      header: 'Wallet',
      sortable: true,
      render: (row) => <span>{stats.currencySymbol}{row.cash.toLocaleString()}</span>,
    },
    {
      key: 'bank',
      header: 'Bank',
      sortable: true,
      render: (row) => <span>{stats.currencySymbol}{row.bank.toLocaleString()}</span>,
    },
    {
      key: 'netWorth',
      header: 'Total Net Worth',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          {stats.currencySymbol}{row.netWorth.toLocaleString()}
        </span>
      ),
    },
  ];

  // Columns for Transactions Table
  const transactionColumns: Column<TransactionRecord>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (row) => (
        <span className="text-[11px] text-slate-500 dark:text-[#717882]">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'userId',
      header: 'User',
      render: (row) => <span className="font-mono text-xs text-slate-600 dark:text-[#c1c7cd]">{row.userId}</span>,
    },
    {
      key: 'actionType',
      header: 'Type',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-indigo-50 dark:bg-[#16181d] border border-indigo-200 dark:border-[#262a33] text-indigo-600 dark:text-indigo-400">
          {row.actionType}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (row) => (
        <span className={row.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium'}>
          {row.amount >= 0 ? '+' : ''}{stats.currencySymbol}{row.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Details / Reason',
      render: (row) => <span className="text-xs text-slate-600 dark:text-[#8c949e]">{row.reason || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#101217] dark:text-[#f0f2f5] flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Economy & Financial System
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8c949e]">
            Manage server money supply, inspect real-time user balances, rewards, and transaction audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStats();
              if (activeTab === 'balances') fetchBalances();
              if (activeTab === 'leaderboard') fetchLeaderboard();
              if (activeTab === 'transactions') fetchTransactions();
              toast.info('Telemetry refreshed.');
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-[#14161b] hover:bg-slate-100 dark:hover:bg-[#1c1f26] border border-black/[0.08] dark:border-[#20242c] text-[#101217] dark:text-[#c1c7cd] hover:text-black dark:hover:text-white flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <button
            onClick={() => setIsResetAllOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-1.5 transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            Reset All Balances
          </button>
        </div>
      </div>

      {/* Top Summary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Money Supply"
          value={`${stats.currencySymbol}${stats.totalNetWorth.toLocaleString()}`}
          subtitle="Circulating cash & deposits"
          icon={Coins}
        />
        <StatCard
          title="Wallet Cash"
          value={`${stats.currencySymbol}${stats.totalCash.toLocaleString()}`}
          subtitle="Liquid user wallets"
          icon={Wallet}
        />
        <StatCard
          title="Bank Deposits"
          value={`${stats.currencySymbol}${stats.totalBank.toLocaleString()}`}
          subtitle="Safely deposited funds"
          icon={Landmark}
        />
        <StatCard
          title="Active Accounts"
          value={stats.totalAccounts.toLocaleString()}
          subtitle={`Avg: ${stats.currencySymbol}${stats.avgNetWorth.toLocaleString()}`}
          icon={Users}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-black/[0.08] dark:border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'balances'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Wallet className="w-4 h-4" />
          User Balances
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'config'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuration & Rewards
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'leaderboard'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Leaderboard
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'transactions'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <History className="w-4 h-4" />
          Audit Log
        </button>
      </div>

      {/* TAB 1: User Balances */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <DataTable
            columns={balanceColumns}
            data={userBalances}
            pageSize={15}
            searchPlaceholder="Search by user ID..."
            searchFilter={(row, q) => row.userId.toLowerCase().includes(q)}
            emptyMessage="No economy accounts found in this server."
            rowKey={(r) => r.userId}
          />
        </div>
      )}

      {/* TAB 2: Configuration & Rewards */}
      {activeTab === 'config' && draft && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
            <SectionHeader
              title="Currency & Starting Capital"
              description="Define the currency symbol and default balance for new server members."
            />
            <SettingRow
              label="Currency Symbol"
              description="Displayed next to all currency amounts in Discord messages and dashboard."
            >
              <input
                type="text"
                maxLength={5}
                value={draft.currencySymbol}
                onChange={(e) => setField('currencySymbol', e.target.value)}
                className="w-24 px-3 py-1.5 text-xs bg-[#f8f9fa] dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
              />
            </SettingRow>

            <SettingRow
              label="Starting Wallet Balance"
              description="Initial cash granted when a user first interacts with the economy."
            >
              <input
                type="number"
                min={0}
                value={draft.startBalance}
                onChange={(e) => setField('startBalance', Number(e.target.value))}
                className="w-36 px-3 py-1.5 text-xs bg-[#f8f9fa] dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
              />
            </SettingRow>
          </div>

          <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
            <SectionHeader
              title="Daily Rewards & Streak Incentives"
              description="Configure rewards earned via the !daily command."
            />
            <SettingRow
              label="Daily Base Reward"
              description="Base payout received every 24 hours."
            >
              <input
                type="number"
                min={0}
                value={draft.dailyRewardAmount}
                onChange={(e) => setField('dailyRewardAmount', Number(e.target.value))}
                className="w-36 px-3 py-1.5 text-xs bg-[#f8f9fa] dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
              />
            </SettingRow>

            <SettingRow
              label="Daily Streak Bonus"
              description="Bonus cash added per consecutive daily streak day."
            >
              <input
                type="number"
                min={0}
                value={draft.dailyStreakBonus}
                onChange={(e) => setField('dailyStreakBonus', Number(e.target.value))}
                className="w-36 px-3 py-1.5 text-xs bg-[#f8f9fa] dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
              />
            </SettingRow>
          </div>

          <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
            <SectionHeader
              title="Passive Chat Income"
              description="Reward members automatically as they chat in active channels."
            />
            <SettingRow
              label="Enable Chat Passive Income"
              description="Randomly awards cash when active messages are detected."
            >
              <input
                type="checkbox"
                checked={draft.passiveIncome}
                onChange={(e) => setField('passiveIncome', e.target.checked)}
                className="w-4 h-4 rounded bg-[#f8f9fa] dark:bg-[#121418] border-black/[0.08] dark:border-[#20242c] text-indigo-600 focus:ring-0 cursor-pointer"
              />
            </SettingRow>

            {draft.passiveIncome && (
              <SettingRow
                label="Passive Payout Rate"
                description="Coins rewarded per qualified chat message interval."
              >
                <input
                  type="number"
                  min={1}
                  value={draft.passiveAmount}
                  onChange={(e) => setField('passiveAmount', Number(e.target.value))}
                  className="w-36 px-3 py-1.5 text-xs bg-[#f8f9fa] dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
                />
              </SettingRow>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <DataTable
            columns={leaderboardColumns}
            data={leaderboard}
            pageSize={20}
            emptyMessage="Leaderboard is currently empty."
            rowKey={(r) => r.userId}
          />
        </div>
      )}

      {/* TAB 4: Transactions */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <DataTable
            columns={transactionColumns}
            data={transactions}
            pageSize={15}
            searchPlaceholder="Filter transactions by user ID..."
            searchFilter={(row, q) => row.userId.toLowerCase().includes(q) || (row.reason || '').toLowerCase().includes(q)}
            emptyMessage="No transaction logs recorded yet."
            rowKey={(r) => r.id}
          />
        </div>
      )}

      {/* Edit User Balance Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0e1013] border border-black/[0.08] dark:border-[#20232b] rounded-xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-[#101217] dark:text-[#f0f2f5]">Edit User Balance</h3>
            <p className="text-xs text-slate-500 dark:text-[#717882] font-mono">User: {editUser.userId}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-[#c1c7cd]">Wallet Cash</label>
                <input
                  type="number"
                  min={0}
                  value={editCash}
                  onChange={(e) => setEditCash(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-1.5 text-xs bg-[#f8f9fa] dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-[#c1c7cd]">Bank Balance</label>
                <input
                  type="number"
                  min={0}
                  value={editBank}
                  onChange={(e) => setEditBank(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-1.5 text-xs bg-[#f8f9fa] dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.08] dark:border-[#1a1d24]">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-[#16181d] text-[#101217] dark:text-[#c1c7cd] hover:text-black dark:hover:text-white border border-black/[0.08] dark:border-[#262a33]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUserBalance}
                disabled={isEditing}
                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                {isEditing ? 'Saving...' : 'Save Balance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Single User Modal */}
      <ConfirmModal
        isOpen={Boolean(resetTargetUser)}
        onClose={() => setResetTargetUser(null)}
        onConfirm={handleConfirmResetUser}
        title="Reset User Balance"
        description={`Are you sure you want to reset all wallet and bank balances for user ${resetTargetUser} to 0? This action cannot be undone.`}
        confirmLabel="Reset to 0"
        variant="danger"
        isLoading={modalLoading}
      />

      {/* Confirm Reset All Modal */}
      <ConfirmModal
        isOpen={isResetAllOpen}
        onClose={() => setIsResetAllOpen(false)}
        onConfirm={handleConfirmResetAll}
        title="CRITICAL: Reset Entire Server Economy"
        description="Are you sure you want to reset ALL user wallet and bank balances across the entire server to 0? This will wipe the global leaderboard and cannot be undone."
        confirmLabel="Wipe All Balances"
        variant="danger"
        isLoading={modalLoading}
      />

      {/* Persistent Save Bar for Config changes */}
      <SaveBar
        isDirty={isDirty}
        saveState={saveState}
        error={saveError}
        onSave={save}
        onReset={reset}
      />
    </div>
  );
}

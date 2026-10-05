'use client';
import { apiFetch } from '@/lib/api';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { PageHeader } from '@/components/ui/PageHeader';

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
import { DataTable, Column } from '@/components/ui/DataTable';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SaveBar } from '@/components/SaveBar';
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

  const [activeTab, setActiveTab] = useState<'balances' | 'leaderboard' | 'transactions' | 'config'>('balances');

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
      const res = await apiFetch(`/api/guilds/${guildId}/economy/stats`);
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
      const res = await apiFetch(`/api/guilds/${guildId}/economy/users`);
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
      const res = await apiFetch(`/api/guilds/${guildId}/economy/leaderboard`);
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
      const res = await apiFetch(`/api/guilds/${guildId}/economy/transactions`);
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
    autoSaveMs: 1500, initialData: initialFormData,
    onSave: async (formValues) => {
      const payload = {
        currency_symbol: formValues.currencySymbol.trim() || '$',
        start_balance: formValues.startBalance,
        daily_reward_amount: formValues.dailyRewardAmount,
        daily_streak_bonus: formValues.dailyStreakBonus,
        passive_income: formValues.passiveIncome,
        passiveAmount: formValues.passiveAmount,
      };

      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
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
      const res = await apiFetch(`/api/guilds/${guildId}/economy/users`, {
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
      const res = await apiFetch(`/api/guilds/${guildId}/economy/users`, {
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
      const res = await apiFetch(`/api/guilds/${guildId}/economy/users`, {
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
        <span className="font-sans text-xs text-text-primary">{row.userId}</span>
      ),
    },
    {
      key: 'cash',
      header: 'Wallet Cash',
      sortable: true,
      render: (row) => (
        <span className="font-sans text-xs font-semibold text-success-text">
          {stats.currencySymbol}{row.cash.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'bank',
      header: 'Bank Balance',
      sortable: true,
      render: (row) => (
        <span className="font-sans text-xs font-semibold text-info-text">
          {stats.currencySymbol}{row.bank.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'netWorth',
      header: 'Net Worth',
      sortable: true,
      render: (row) => (
        <span className="font-sans text-xs font-bold text-text-primary">
          {stats.currencySymbol}{row.netWorth.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5 font-sans">
          <button
            onClick={() => {
              setEditUser(row);
              setEditCash(row.cash);
              setEditBank(row.bank);
            }}
            className="btn-secondary py-1 px-2 text-[11px]"
            title="Edit balance"
          >
            <Edit2 className="w-3 h-3 mr-1 text-text-secondary" />
            edit
          </button>
          <button
            onClick={() => setResetTargetUser(row.userId)}
            className="btn-outline-danger py-1 px-2 text-[11px]"
            title="Reset balance"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            reset
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
      width: 'w-20',
      render: (row) => {
        let tagClass = 'text-text-secondary bg-white/[0.04] border-white/[0.08]';
        if (row.rank === 1) tagClass = 'text-warning-text bg-warning/10 border-warning/25 font-bold';
        if (row.rank === 2) tagClass = 'text-text-primary bg-white/[0.1] border-white/[0.2] font-semibold';
        if (row.rank === 3) tagClass = 'text-[#fb923c] bg-[#f97316]/10 border-[#f97316]/25';
        return (
          <span className={`console-tag ${tagClass}`}>
            #{row.rank}
          </span>
        );
      },
    },
    {
      key: 'userId',
      header: 'User Snowflake',
      sortable: true,
      render: (row) => <span className="font-sans text-xs text-text-secondary">{row.userId}</span>,
    },
    {
      key: 'cash',
      header: 'Wallet',
      sortable: true,
      render: (row) => <span className="font-sans text-xs text-text-primary">{stats.currencySymbol}{row.cash.toLocaleString()}</span>,
    },
    {
      key: 'bank',
      header: 'Bank',
      sortable: true,
      render: (row) => <span className="font-sans text-xs text-text-primary">{stats.currencySymbol}{row.bank.toLocaleString()}</span>,
    },
    {
      key: 'netWorth',
      header: 'Total Net Worth',
      sortable: true,
      render: (row) => (
        <span className="font-sans text-xs font-bold text-success-text">
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
        <span className="font-sans text-[11px] text-text-secondary">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'userId',
      header: 'User ID',
      render: (row) => <span className="font-sans text-xs text-text-secondary">{row.userId}</span>,
    },
    {
      key: 'actionType',
      header: 'Type',
      render: (row) => (
        <span className="console-tag console-tag-economy">
          {row.actionType}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (row) => (
        <span className={`font-sans text-xs font-medium ${row.amount >= 0 ? 'text-success-text' : 'text-critical-text'}`}>
          {row.amount >= 0 ? '+' : ''}{stats.currencySymbol}{row.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Details / Reason',
      render: (row) => <span className="font-sans text-xs text-text-secondary">{row.reason || '—'}</span>,
    },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-24">
      <PageHeader guildId={guildId} title="Economy & rewards" description="Manage rewards, member balances, and transactions." actions={<div className="flex items-center gap-2 font-sans">
            <button
              onClick={() => {
                fetchStats();
                if (activeTab === 'balances') fetchBalances();
                if (activeTab === 'leaderboard') fetchLeaderboard();
                if (activeTab === 'transactions') fetchTransactions();
              }}
              className="btn-secondary"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </button>

            <button
              onClick={() => setIsResetAllOpen(true)}
              className="btn-outline-danger"
            >
              <AlertOctagon className="w-3.5 h-3.5 mr-1.5" />
              Reset all balances
            </button>
          </div>}/>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Net Worth</span>
            <span className="console-tag console-tag-economy">TOTAL</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-text-primary tracking-tight">
            {stats.currencySymbol}{stats.totalNetWorth.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            circulating money supply
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Liquid Cash</span>
            <span className="console-tag console-tag-readv">WALLETS</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-success-text tracking-tight">
            {stats.currencySymbol}{stats.totalCash.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            active user cash
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Bank Deposits</span>
            <span className="console-tag console-tag-readv">VAULT</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-info-text tracking-tight">
            {stats.currencySymbol}{stats.totalBank.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            safely deposited funds
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Active Accounts</span>
            <span className="console-tag console-tag-readv">USERS</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-text-primary tracking-tight">
            {stats.totalAccounts.toLocaleString()}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            avg: {stats.currencySymbol}{stats.avgNetWorth.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Terminal Tab Strip */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-2 text-xs font-sans">
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'balances'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>balances</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>leaderboard</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>transactions</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'config'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>config</span>
        </button>
      </div>

      {/* TAB 1: User Balances */}
      {activeTab === 'balances' && (
        <div className="surface-container">
          <div className="panel-header">
            <span>member account balances</span>
            <span className="text-text-secondary">{userBalances.length} records</span>
          </div>
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

      {/* TAB 2: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="surface-container">
          <div className="panel-header">
            <span>server net worth ranking</span>
            <span className="text-text-secondary">top holders</span>
          </div>
          <DataTable
            columns={leaderboardColumns}
            data={leaderboard}
            pageSize={20}
            emptyMessage="Leaderboard is currently empty."
            rowKey={(r) => r.userId}
          />
        </div>
      )}

      {/* TAB 3: Transactions */}
      {activeTab === 'transactions' && (
        <div className="surface-container">
          <div className="panel-header">
            <span>audit trail & transaction ledger</span>
            <span className="text-text-secondary">{transactions.length} entries</span>
          </div>
          <DataTable
            columns={transactionColumns}
            data={transactions}
            pageSize={15}
            searchPlaceholder="Filter transactions by user ID or reason..."
            searchFilter={(row, q) => row.userId.toLowerCase().includes(q) || (row.reason || '').toLowerCase().includes(q)}
            emptyMessage="No transaction logs recorded yet."
            rowKey={(r) => r.id}
          />
        </div>
      )}

      {/* TAB 4: Configuration & Rewards */}
      {activeTab === 'config' && draft && (
        <div className="space-y-4 font-sans">
          <div className="surface-container p-4 space-y-4">
            <div className="panel-header -mx-4 -mt-4 mb-4">
              <span>currency & starting capital</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.04]">
              <div>
                <div className="text-xs text-text-primary font-semibold">Currency Symbol</div>
                <div className="text-[11px] text-text-secondary">Symbol displayed before amounts across all modules and Discord commands.</div>
              </div>
              <input
                type="text"
                maxLength={5}
                value={draft.currencySymbol}
                onChange={(e) => setField('currencySymbol', e.target.value)}
                className="glass-input font-sans w-28 text-center"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs text-text-primary font-semibold">Starting Wallet Balance</div>
                <div className="text-[11px] text-text-secondary">Initial currency deposited into new members' wallets upon joining.</div>
              </div>
              <input
                type="number"
                min={0}
                value={draft.startBalance}
                onChange={(e) => setField('startBalance', Number(e.target.value))}
                className="glass-input font-sans w-36 text-right"
              />
            </div>
          </div>

          <div className="surface-container p-4 space-y-4">
            <div className="panel-header -mx-4 -mt-4 mb-4">
              <span>daily rewards & streak incentives</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.04]">
              <div>
                <div className="text-xs text-text-primary font-semibold">Daily Reward Base</div>
                <div className="text-[11px] text-text-secondary">Base currency granted every 24 hours via daily reward command.</div>
              </div>
              <input
                type="number"
                min={0}
                value={draft.dailyRewardAmount}
                onChange={(e) => setField('dailyRewardAmount', Number(e.target.value))}
                className="glass-input font-sans w-36 text-right"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs text-text-primary font-semibold">Daily Streak Bonus</div>
                <div className="text-[11px] text-text-secondary">Additional payout accumulated per consecutive daily claim.</div>
              </div>
              <input
                type="number"
                min={0}
                value={draft.dailyStreakBonus}
                onChange={(e) => setField('dailyStreakBonus', Number(e.target.value))}
                className="glass-input font-sans w-36 text-right"
              />
            </div>
          </div>

          <div className="surface-container p-4 space-y-4">
            <div className="panel-header -mx-4 -mt-4 mb-4">
              <span>passive chat income</span>
            </div>

            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.04]">
              <div>
                <div className="text-xs text-text-primary font-semibold">Chat Activity Rewards</div>
                <div className="text-[11px] text-text-secondary">Automatically grant coins to active members while chatting.</div>
              </div>
              <input
                type="checkbox"
                checked={draft.passiveIncome}
                onChange={(e) => setField('passiveIncome', e.target.checked)}
                className="w-4 h-4 rounded bg-surface-1 border border-white/[0.08] text-success-text focus:ring-0 cursor-pointer"
              />
            </div>

            {draft.passiveIncome && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-text-primary font-semibold">Payout per Message Cycle</div>
                  <div className="text-[11px] text-text-secondary">Coins rewarded when chat activity cooldown elapses.</div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={draft.passiveAmount}
                  onChange={(e) => setField('passiveAmount', Number(e.target.value))}
                  className="glass-input font-sans w-36 text-right"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Balance Modal */}
      {editUser && (
        <AnimatedModal isOpen={Boolean(editUser)} onClose={() => { if (!isEditing) setEditUser(null); }} title="Edit user balance" subtitle={editUser.userId} maxWidth="max-w-sm">
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[11px] font-sans text-text-secondary">Wallet Cash ({stats.currencySymbol})</label>
                <input
                  type="number"
                  min={0}
                  value={editCash}
                  onChange={(e) => setEditCash(Number(e.target.value))}
                  className="glass-input font-sans mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-sans text-text-secondary">Bank Balance ({stats.currencySymbol})</label>
                <input
                  type="number"
                  min={0}
                  value={editBank}
                  onChange={(e) => setEditBank(Number(e.target.value))}
                  className="glass-input font-sans mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-3 border-t border-white/[0.06] bg-surface-1">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="btn-secondary"
              >
                cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUserBalance}
                disabled={isEditing}
                className="btn-primary"
              >
                {isEditing ? 'saving...' : 'save balance'}
              </button>
            </div>
        </AnimatedModal>
      )}

      {/* Confirm Reset Single User Modal */}
      <ConfirmModal
        isOpen={Boolean(resetTargetUser)}
        onClose={() => setResetTargetUser(null)}
        onConfirm={handleConfirmResetUser}
        title="// reset user balance"
        description={`Are you sure you want to reset all wallet and bank balances for user ${resetTargetUser} to 0? This action cannot be undone.`}
        confirmLabel="reset to 0"
        variant="danger"
        isLoading={modalLoading}
      />

      {/* Confirm Reset All Modal */}
      <ConfirmModal
        isOpen={isResetAllOpen}
        onClose={() => setIsResetAllOpen(false)}
        onConfirm={handleConfirmResetAll}
        title="// CRITICAL: wipe server economy"
        description="Are you sure you want to reset ALL user wallet and bank balances across the entire server to 0? This will wipe the global leaderboard and cannot be undone."
        confirmLabel="wipe all balances"
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

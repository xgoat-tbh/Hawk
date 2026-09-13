'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import {
  Users,
  MessageSquare,
  BarChart2,
  Clock,
  Radio,
  Coins,
  ShoppingBag,
  Pin,
  Gamepad2,
  Briefcase,
  Dice5,
  ChevronRight,
  ArrowRight,
  Send,
  Gift,
  MoreHorizontal,
  UserCheck,
  Award,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from 'recharts';
import { SendMessageModal } from '@/components/Overview/SendMessageModal';
import { AddRewardModal } from '@/components/Overview/AddRewardModal';
import { SystemHealthDrawer } from '@/components/Overview/SystemHealthDrawer';
import { ActivityLogDrawer } from '@/components/Overview/ActivityLogDrawer';
import { ServerSwitcherModal } from '@/components/Overview/ServerSwitcherModal';
import { useToast } from '@/components/ui/Toast';

// Sparkline SVG with soft gradient
function SparklineWave({ color = '#22c55e', width = 64, height = 24 }: { color?: string; width?: number; height?: number }) {
  const gradId = `wave-grad-${color.replace('#', '')}`;
  return (
    <svg width={width} height={height} viewBox="0 0 64 24" fill="none" className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 18 C14 18, 18 8, 30 12 C42 16, 48 4, 64 6 L64 24 L0 24 Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M0 18 C14 18, 18 8, 30 12 C42 16, 48 4, 64 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function GuildOverviewPage() {
  const { guildId } = useParams() as { guildId: string };
  const { guild, config, refreshData } = useGuildData();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'messages' | 'members' | 'commands'>('messages');
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h');

  // Modals state
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [addRewardOpen, setAddRewardOpen] = useState(false);
  const [systemHealthOpen, setSystemHealthOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [serverSwitcherOpen, setServerSwitcherOpen] = useState(false);

  // Live Stats State
  const [stats, setStats] = useState<{
    summary: {
      members: number;
      presenceCount?: number;
      memberChangePct: number;
      messagesPerHr: number;
      messagesChangePct: number;
      modulesActive: number;
      modulesTotal: number;
      gatewayPing: number;
    };
    systemHealth: {
      cpu: number;
      memory: number;
      gateway: number;
      uptime: string;
      status: string;
    };
    recentActivity: Array<{
      id: string | number;
      type: string;
      actorName: string;
      targetName: string;
      relativeTime: string;
    }>;
    activityChart: Array<{
      hour: string;
      fullHour?: number;
      messages: number;
      members: number;
      commands: number;
      count?: number;
    }>;
  }>({
    summary: {
      members: guild?.approximateMemberCount || guild?.memberCount || 0,
      presenceCount: guild?.approximatePresenceCount || 0,
      memberChangePct: 0,
      messagesPerHr: 0,
      messagesChangePct: 0,
      modulesActive: 0,
      modulesTotal: 9,
      gatewayPing: 0,
    },
    systemHealth: {
      cpu: 0,
      memory: 0,
      gateway: 0,
      uptime: '100%',
      status: 'operational',
    },
    recentActivity: [],
    activityChart: [],
  });

  useEffect(() => {
    if (guild?.approximateMemberCount) {
      setStats((prev) => ({
        ...prev,
        summary: {
          ...prev.summary,
          members: prev.summary.members || guild.approximateMemberCount || 0,
          presenceCount: prev.summary.presenceCount || guild.approximatePresenceCount || 0,
        },
      }));
    }
  }, [guild?.approximateMemberCount, guild?.approximatePresenceCount]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Failed to fetch guild stats:', err);
    }
  }, [guildId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Quick Action: Create Voice Channel
  const handleCreateVoice = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/quick-actions/create-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create voice channel');
      success(`Created temporary voice room: ${data.channelName}`);
      fetchStats();
      refreshData();
    } catch (err: any) {
      error(err.message || 'Failed to create voice channel');
    }
  };

  // 9 Module Cards Config
  const moduleCards = [
    {
      id: 'welcome',
      title: 'Welcome',
      active: Boolean(config?.welcome?.config?.enabled && config?.welcome?.config?.channel_id),
      path: `/dashboard/${guildId}/welcome`,
      icon: UserCheck,
      color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'pvc',
      title: 'Private Voice',
      active: Boolean(config?.economy?.pvc_jtc_channel_id),
      path: `/dashboard/${guildId}/pvc`,
      icon: Radio,
      color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'economy',
      title: 'Economy',
      active: Boolean(config?.economy?.daily_reward_amount || config?.economy?.passive_income),
      path: `/dashboard/${guildId}/economy`,
      icon: Coins,
      color: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
    },
    {
      id: 'store',
      title: 'Store',
      active: true,
      path: `/dashboard/${guildId}/store`,
      icon: ShoppingBag,
      color: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
    },
    {
      id: 'sticky',
      title: 'Sticky Notices',
      active: (config?.stickyMessages || []).length > 0,
      path: `/dashboard/${guildId}/sticky`,
      icon: Pin,
      color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'gaming',
      title: 'Gaming LFG',
      active: (config?.gamePings || []).length > 0,
      path: `/dashboard/${guildId}/gaming`,
      icon: Gamepad2,
      color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'community',
      title: 'Community Feedback',
      active: Boolean(config?.suggestion?.submission_channel_id || config?.confession?.submission_channel_id),
      path: `/dashboard/${guildId}/community`,
      icon: MessageSquare,
      color: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
    },
    {
      id: 'income',
      title: 'Role Salaries',
      active: (config?.incomeRoles || []).length > 0,
      path: `/dashboard/${guildId}/income`,
      icon: Briefcase,
      color: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'games',
      title: 'Minigames',
      active: true,
      path: `/dashboard/${guildId}/games`,
      icon: Dice5,
      color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  ];

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#181b21] border border-black/[0.08] dark:border-white/[0.08] px-3.5 py-2 rounded-xl shadow-xl text-center select-none animate-in fade-in zoom-in-95 duration-100">
          <div className="text-sm font-bold text-[#101217] dark:text-white font-mono">
            {Number(payload[0].value).toLocaleString()}
          </div>
          <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] capitalize">
            {activeTab}
          </div>
        </div>
      );
    }
    return null;
  };

  const getActivityItemIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <UserCheck className="w-4 h-4 text-sky-500" />;
      case 'role_reward':
        return <Award className="w-4 h-4 text-purple-500" />;
      case 'voice_create':
        return <Radio className="w-4 h-4 text-blue-500" />;
      case 'store_purchase':
        return <ShoppingBag className="w-4 h-4 text-rose-500" />;
      case 'streak_reward':
        return <Zap className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="bento-overview-root space-y-3 max-w-[1400px] mx-auto pb-0 select-none">
      {/* 2-Column Bento Grid Container */}
      <div className="bento-overview-container grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN (Wider): 4 StatCards, Activity Chart, Modules */}
        {/* ======================================================== */}
        <div className="bento-overview-left lg:col-span-8 space-y-3">
          {/* 1. Four Stat Cards */}
          <div className="bento-stat-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {/* Card 1: Members */}
            <div className="bento-stat-card p-3 rounded-2xl bg-white/80 dark:bg-[#121418] border border-black/[0.05] dark:border-white/[0.06] shadow-sm flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="bento-stat-icon w-8 h-8 rounded-xl bg-[#f0f4ff] dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="bento-stat-val text-base font-extrabold text-[#101217] dark:text-white tracking-tight">
                    {stats.summary.members.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                    Members
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                {stats.summary.presenceCount ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {stats.summary.presenceCount.toLocaleString()} online
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 rounded-md">
                    Live
                  </span>
                )}
                <SparklineWave color="#22c55e" width={48} height={16} />
              </div>
            </div>

            {/* Card 2: Messages / hr */}
            <div className="bento-stat-card p-3 rounded-2xl bg-white/80 dark:bg-[#121418] border border-black/[0.05] dark:border-white/[0.06] shadow-sm flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="bento-stat-icon w-8 h-8 rounded-xl bg-[#f5f3ff] dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="bento-stat-val text-base font-extrabold text-[#101217] dark:text-white tracking-tight">
                    {stats.summary.messagesPerHr.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                    Messages / hr
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded-md">
                  Last 1h
                </span>
                <SparklineWave color="#3b82f6" width={48} height={16} />
              </div>
            </div>

            {/* Card 3: Modules Active */}
            <div className="bento-stat-card p-3 rounded-2xl bg-white/80 dark:bg-[#121418] border border-black/[0.05] dark:border-white/[0.06] shadow-sm flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="bento-stat-icon w-8 h-8 rounded-xl bg-[#eff6ff] dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="bento-stat-val text-base font-extrabold text-[#101217] dark:text-white tracking-tight">
                    {stats.summary.modulesActive}
                  </div>
                  <div className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                    Modules Active
                  </div>
                </div>
              </div>
              {/* Colored Indicator Dots */}
              <div className="flex items-center gap-1">
                {[...Array(stats.summary.modulesTotal || 9)].map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i < stats.summary.modulesActive
                        ? 'bg-emerald-500'
                        : 'bg-black/10 dark:bg-white/15'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Card 4: Gateway */}
            <div className="bento-stat-card p-3 rounded-2xl bg-white/80 dark:bg-[#121418] border border-black/[0.05] dark:border-white/[0.06] shadow-sm flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="bento-stat-icon w-8 h-8 rounded-xl bg-[#f0fdf4] dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="bento-stat-val text-base font-extrabold text-[#101217] dark:text-white tracking-tight">
                    {stats.summary.gatewayPing}ms
                  </div>
                  <div className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                    Gateway
                  </div>
                </div>
              </div>
              <SparklineWave color="#10b981" width={48} height={16} />
            </div>
          </div>

          {/* 2. Activity Bar Chart */}
          <div className="bento-activity-card p-4 rounded-2xl bg-white/80 dark:bg-[#121418] border border-black/[0.05] dark:border-white/[0.06] shadow-sm space-y-3">
            {/* Activity Chart Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h2 className="text-sm font-bold text-[#101217] dark:text-white">
                  Activity
                </h2>
                <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  Real-time server activity
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Segmented Control */}
                <div className="p-0.5 rounded-xl bg-[#f1f5f9] dark:bg-[#181b21] flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('messages')}
                    className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
                      activeTab === 'messages'
                        ? 'bg-white dark:bg-[#252830] text-[#101217] dark:text-white font-semibold shadow-sm'
                        : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#101217]'
                    }`}
                  >
                    Messages
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
                      activeTab === 'members'
                        ? 'bg-white dark:bg-[#252830] text-[#101217] dark:text-white font-semibold shadow-sm'
                        : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#101217]'
                    }`}
                  >
                    Members
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('commands')}
                    className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
                      activeTab === 'commands'
                        ? 'bg-white dark:bg-[#252830] text-[#101217] dark:text-white font-semibold shadow-sm'
                        : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#101217]'
                    }`}
                  >
                    Commands
                  </button>
                </div>

                {/* Range Selector */}
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="px-2 py-1 text-[11px] font-semibold rounded-xl bg-[#f1f5f9] dark:bg-[#181b21] border-none text-[#101217] dark:text-white focus:outline-none"
                >
                  <option value="24h">24h</option>
                  <option value="7d">7d</option>
                </select>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="bento-activity-chart h-32 sm:h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.activityChart.map((item) => ({
                    ...item,
                    count: (item as any)[activeTab] ?? item.count ?? 0,
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
                >
                  <XAxis
                    dataKey="hour"
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    interval={3}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2 rounded-xl bg-[#101217] border border-white/10 text-white shadow-xl text-[10px] space-y-0.5">
                            <p className="font-semibold text-[#94a3b8]">
                              {payload[0].payload.hour}
                            </p>
                            <p className="font-mono text-xs font-bold text-white">
                              {payload[0].value?.toLocaleString()} {activeTab}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Nine Modules Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#101217] dark:text-white">
                  Modules
                </span>
                <span className="text-[10px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                  Manage and configure your server&apos;s features
                </span>
              </div>

              <Link
                href={`/dashboard/${guildId}/general`}
                className="text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] hover:text-[#101217] dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Manage all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 3x3 Bento Module Cards */}
            <div className="bento-modules-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {moduleCards.map((m) => {
                const Icon = m.icon;
                return (
                  <Link
                    key={m.id}
                    href={m.path}
                    className="bento-module-card p-2.5 rounded-2xl bg-white/80 dark:bg-[#121418] border border-black/[0.05] dark:border-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.15] shadow-sm flex items-center justify-between gap-2.5 transition-all hover:scale-[1.01] group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`bento-module-icon w-8 h-8 rounded-xl ${m.color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#101217] dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {m.title}
                        </div>
                        <div className="text-[9px] text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1.5 pt-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{m.active ? 'Active' : 'Disabled'}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#101217] dark:group-hover:text-white transition-colors shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Server Card, Health, Recent, Quick Actions */}
        {/* ======================================================== */}
        <div className="bento-overview-right lg:col-span-4 space-y-3">
          {/* 1. Amo India Server Card (Dark Smoky Glass Aesthetic) */}
          <div className="bento-server-card relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#1a1c22] via-[#15171c] to-[#0d0e12] text-white shadow-md border border-white/[0.08]">
            <div className="relative z-10 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white tracking-tight">
                      {guild?.name || 'Amo India'}
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-white/60 pt-0.5">
                    Amo Bot Connected • Ready
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setServerSwitcherOpen(true)}
                  className="w-7 h-7 rounded-full bg-white/[0.1] hover:bg-white/[0.2] border border-white/[0.15] flex items-center justify-center text-white transition-all hover:scale-105"
                  title="Switch Server"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-1.5 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-white/70 font-medium">
                <span>{stats.summary.members.toLocaleString()} members</span>
                <span>•</span>
                <span>{stats.summary.modulesActive} modules</span>
              </div>

              {guild?.description ? (
                <div className="bento-server-tagline pt-0.5">
                  <p className="text-[11px] italic text-white/50 font-serif line-clamp-2">
                    &ldquo;{guild.description}&rdquo;
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* 2. System Health Card */}
          <div className="bento-health-card bento-right-card p-3.5 rounded-2xl bg-white/80 dark:bg-[#121418] border border-black/[0.05] dark:border-white/[0.06] shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#101217] dark:text-white">
                System Health
              </h3>
              <button
                type="button"
                onClick={() => setSystemHealthOpen(true)}
                className="px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full flex items-center gap-1 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>All systems operational</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* 4 Health Progress Columns */}
            <div className="grid grid-cols-4 gap-2 text-center pt-0.5">
              <div>
                <div className="text-xs font-extrabold text-[#101217] dark:text-white font-mono">
                  {stats.systemHealth.cpu}%
                </div>
                <div className="text-[9px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                  CPU
                </div>
                <div className="w-full h-1 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.systemHealth.cpu}%` }} />
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold text-[#101217] dark:text-white font-mono">
                  {stats.systemHealth.memory}%
                </div>
                <div className="text-[9px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                  Memory
                </div>
                <div className="w-full h-1 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${stats.systemHealth.memory}%` }} />
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold text-[#101217] dark:text-white font-mono">
                  {stats.systemHealth.gateway}ms
                </div>
                <div className="text-[9px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                  Gateway
                </div>
                <div className="w-full h-1 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '40%' }} />
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold text-[#101217] dark:text-white font-mono">
                  {stats.systemHealth.uptime}
                </div>
                <div className="text-[9px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                  Uptime
                </div>
                <div className="w-full h-1 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '99%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Recent Activity Card */}
          <div className="bento-activity-feed bento-right-card p-3.5 rounded-2xl bg-white/80 dark:bg-[#121418] border border-black/[0.05] dark:border-white/[0.06] shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#101217] dark:text-white">
                Recent Activity
              </h3>
              <button
                type="button"
                onClick={() => setActivityLogOpen(true)}
                className="text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] hover:text-[#101217] dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 pt-0.5">
              {stats.recentActivity.length === 0 ? (
                <div className="py-3 text-center text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                  No recent activity recorded yet.
                </div>
              ) : (
                stats.recentActivity.slice(0, 4).map((item) => (
                  <div key={item.id} className="bento-recent-item flex items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#f8fafc] dark:bg-[#181b21] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center shrink-0">
                        {getActivityItemIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[11px] text-[#101217] dark:text-white truncate">
                          {item.type === 'welcome'
                            ? 'Welcome message sent'
                            : item.type === 'role_reward'
                            ? 'Role reward claimed'
                            : item.type === 'voice_create'
                            ? 'Temporary voice room created'
                            : item.type === 'store_purchase'
                            ? 'Store purchase completed'
                            : item.type === 'streak_reward'
                            ? 'Streak reward given'
                            : 'Bot interaction completed'}
                        </div>
                        <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8] truncate">
                          {item.actorName} {item.targetName}
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] font-mono text-[#94a3b8] shrink-0">
                      {item.relativeTime}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Quick Actions Card */}
          <div className="bento-quick-actions bento-right-card p-3.5 rounded-2xl bg-white/80 dark:bg-[#121418] border border-black/[0.05] dark:border-white/[0.06] shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#101217] dark:text-white">
                Quick Actions
              </h3>
              <Link
                href={`/dashboard/${guildId}/general`}
                className="px-2 py-0.5 text-[9px] font-semibold text-[#64748b] dark:text-[#94a3b8] bg-[#f1f5f9] dark:bg-[#181b21] hover:text-[#101217] dark:hover:text-white rounded-full transition-colors"
              >
                Customize
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              {/* Send Message */}
              <button
                type="button"
                onClick={() => setSendMessageOpen(true)}
                className="bento-quick-btn p-2 rounded-xl bg-[#f8fafc] dark:bg-[#181b21] border border-black/[0.04] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1 transition-all text-center group"
              >
                <Send className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold text-[#101217] dark:text-white">
                  Send Message
                </span>
              </button>

              {/* Create Voice */}
              <button
                type="button"
                onClick={handleCreateVoice}
                className="bento-quick-btn p-2 rounded-xl bg-[#f8fafc] dark:bg-[#181b21] border border-black/[0.04] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1 transition-all text-center group"
              >
                <Radio className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold text-[#101217] dark:text-white">
                  Create Voice
                </span>
              </button>

              {/* Add Reward */}
              <button
                type="button"
                onClick={() => setAddRewardOpen(true)}
                className="bento-quick-btn p-2 rounded-xl bg-[#f8fafc] dark:bg-[#181b21] border border-black/[0.04] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1 transition-all text-center group"
              >
                <Gift className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold text-[#101217] dark:text-white">
                  Add Reward
                </span>
              </button>

              {/* Overflow / More */}
              <Link
                href={`/dashboard/${guildId}/permissions?tab=audit`}
                className="bento-quick-btn p-2 rounded-xl bg-[#f8fafc] dark:bg-[#181b21] border border-black/[0.04] dark:border-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex flex-col items-center justify-center gap-1 transition-all text-center group"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-[#94a3b8] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold text-[#101217] dark:text-white">
                  Audit Logs
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Drawers & Modals */}
      <SendMessageModal
        isOpen={sendMessageOpen}
        onClose={() => setSendMessageOpen(false)}
        onSuccess={fetchStats}
      />

      <AddRewardModal
        isOpen={addRewardOpen}
        onClose={() => setAddRewardOpen(false)}
        onSuccess={fetchStats}
      />

      <SystemHealthDrawer
        isOpen={systemHealthOpen}
        onClose={() => setSystemHealthOpen(false)}
        health={stats.systemHealth}
      />

      <ActivityLogDrawer
        isOpen={activityLogOpen}
        onClose={() => setActivityLogOpen(false)}
      />

      <ServerSwitcherModal
        isOpen={serverSwitcherOpen}
        onClose={() => setServerSwitcherOpen(false)}
        memberCount={stats.summary.members}
        modulesActive={stats.summary.modulesActive}
      />
    </div>
  );
}

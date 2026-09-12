'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import {
  ShieldCheck,
  Zap,
  Users,
  Sliders,
  Pin,
  Coins,
  Radio,
  Lock,
  ArrowUpRight,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  HeartHandshake,
  Image as ImageIcon,
  Gamepad2,
  ShoppingBag,
  Dice5,
  MessageSquare,
} from 'lucide-react';

export default function GuildOverviewPage() {
  const { guildId } = useParams() as { guildId: string };
  const { guild, bot, channels, roles, config } = useGuildData();

  const [activeTab, setActiveTab] = useState<'modules' | 'console' | 'health'>('modules');

  const channelMap = new Set(channels.map((c) => c.id));

  // Diagnostic health checks
  const healthChecks = [
    {
      id: 'pvc',
      name: 'Join-To-Create Voice Channel',
      status: !config?.economy?.pvc_jtc_channel_id
        ? 'optional'
        : channelMap.has(config.economy.pvc_jtc_channel_id)
        ? 'healthy'
        : 'stale',
      message: !config?.economy?.pvc_jtc_channel_id
        ? 'Not configured (Optional)'
        : channelMap.has(config.economy.pvc_jtc_channel_id)
        ? 'Active voice generator channel'
        : 'Configured JTC channel was deleted from Discord',
      fixPath: `/dashboard/${guildId}/pvc`,
    },
    {
      id: 'logging',
      name: 'Audit & Mod Logging',
      status: !config?.general?.log_channel_id
        ? 'optional'
        : channelMap.has(config.general.log_channel_id)
        ? 'healthy'
        : 'stale',
      message: !config?.general?.log_channel_id
        ? 'No audit logging channel set'
        : channelMap.has(config.general.log_channel_id)
        ? 'Audit logs streaming to channel'
        : 'Target logging channel is missing',
      fixPath: `/dashboard/${guildId}/general`,
    },
    {
      id: 'welcome',
      name: 'Welcome Greetings',
      status: !config?.welcome?.config?.channel_id
        ? 'optional'
        : channelMap.has(config.welcome.config.channel_id)
        ? 'healthy'
        : 'stale',
      message: !config?.welcome?.config?.channel_id
        ? 'Welcome channel not set'
        : channelMap.has(config.welcome.config.channel_id)
        ? 'Greetings active and routing'
        : 'Configured welcome channel missing from Discord',
      fixPath: `/dashboard/${guildId}/welcome`,
    },
  ];

  const staleIssues = healthChecks.filter((h) => h.status === 'stale');

  const activeModules = [
    {
      name: 'Welcome Greetings',
      active: Boolean(config?.welcome?.config?.enabled && config?.welcome?.config?.channel_id),
      description: 'Automated greeting embeds and DM delivery',
      path: `/dashboard/${guildId}/welcome`,
      icon: HeartHandshake,
    },
    {
      name: 'Private Voice (PVC)',
      active: Boolean(config?.economy?.pvc_jtc_channel_id),
      description: 'Join-to-Create dynamic temporary voice rooms',
      path: `/dashboard/${guildId}/pvc`,
      icon: Radio,
    },
    {
      name: 'Economy & Rewards',
      active: Boolean(config?.economy?.daily_reward_amount || config?.economy?.passive_income),
      description: 'Streaks, chat rewards, and currency system',
      path: `/dashboard/${guildId}/economy`,
      icon: Coins,
    },
    {
      name: 'Store Catalog',
      active: true,
      description: 'Custom purchasable items and role rewards',
      path: `/dashboard/${guildId}/store`,
      icon: ShoppingBag,
    },
    {
      name: 'Media-Only Channels',
      active: (config?.mediaChannels || []).length > 0,
      description: 'Enforces media attachments & auto-threads',
      path: `/dashboard/${guildId}/media`,
      icon: ImageIcon,
    },
    {
      name: 'Sticky Notices',
      active: (config?.stickyMessages || []).length > 0,
      description: 'Pinned bottom messages per channel',
      path: `/dashboard/${guildId}/sticky`,
      icon: Pin,
    },
    {
      name: 'Gaming LFG Alerts',
      active: (config?.gamePings || []).length > 0,
      description: 'Voice room activity pings for players',
      path: `/dashboard/${guildId}/gaming`,
      icon: Gamepad2,
    },
    {
      name: 'Community Feedback',
      active: Boolean(config?.suggestion?.submission_channel_id || config?.confession?.submission_channel_id),
      description: 'Suggestions voting and anonymous confessions',
      path: `/dashboard/${guildId}/community`,
      icon: MessageSquare,
    },
  ];

  const activeCount = activeModules.filter((m) => m.active).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Server Banner */}
      <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#14161b] border border-[#20242c] flex items-center justify-center overflow-hidden shrink-0">
            {guild?.iconUrl ? (
              <img src={guild.iconUrl} alt={guild.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold font-mono text-white">
                {guild?.name ? guild.name.slice(0, 2).toUpperCase() : 'HK'}
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#f0f2f5]">
                {guild?.name || 'Discord Server'}
              </h1>
              <StatusBadge status="OPERATIONAL" variant="operational" />
            </div>
            <p className="text-xs text-[#8c949e]">
              Snowflake: <span className="font-mono">{guildId}</span> • Bot: <span className="text-indigo-400 font-semibold">{bot?.username || 'Hawk'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href={`/dashboard/${guildId}/permissions`}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14161b] hover:bg-[#1c1f26] border border-[#20242c] text-[#c1c7cd] hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Permissions Matrix</span>
          </Link>
          <Link
            href={`/dashboard/${guildId}/general`}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>General Settings</span>
          </Link>
        </div>
      </div>

      {/* Stale Configuration Warning Banner if any */}
      {staleIssues.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Configuration Alert ({staleIssues.length} issue{staleIssues.length > 1 ? 's' : ''} detected)</span>
          </div>
          <div className="space-y-1.5 pl-6">
            {staleIssues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between text-xs text-[#c1c7cd]">
                <span>{issue.name}: {issue.message}</span>
                <Link
                  href={issue.fixPath}
                  className="px-2.5 py-1 rounded bg-[#14161b] border border-[#20242c] text-[10px] font-mono text-amber-400 hover:text-white flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Resolve</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gateway Status"
          value="Connected"
          subtitle="0 dropped websocket frames"
          icon={Activity}
        />
        <StatCard
          title="Active Modules"
          value={`${activeCount} / ${activeModules.length}`}
          subtitle="Real-time enforcement"
          icon={Zap}
        />
        <StatCard
          title="Discord Channels"
          value={channels.length}
          subtitle="Synchronized for routing"
          icon={Users}
        />
        <StatCard
          title="Server Roles"
          value={roles.length}
          subtitle="Mapped for permissions"
          icon={ShieldCheck}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('modules')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'modules'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Zap className="w-4 h-4" />
          Module Status ({activeCount} Active)
        </button>

        <button
          onClick={() => setActiveTab('console')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'console'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Quick Console
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'health'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Activity className="w-4 h-4" />
          Health Diagnostics
        </button>
      </div>

      {/* TAB 1: Modules Grid */}
      {activeTab === 'modules' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="Server Modules & Operational State"
            description="Status overview of automated Discord features and background workers configured for this server."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeModules.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.name}
                  href={m.path}
                  className="p-4 rounded-xl bg-[#121418] border border-[#1a1d24] hover:border-indigo-500/40 hover:bg-[#16181d] flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {m.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8c949e] truncate">
                      {m.description}
                    </div>
                    <div className="text-[10px] font-mono pt-1">
                      {m.active ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Active & Enforcing
                        </span>
                      ) : (
                        <span className="text-[#717882]">Not configured</span>
                      )}
                    </div>
                  </div>

                  <ArrowUpRight className="w-4 h-4 text-[#717882] group-hover:text-white transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Quick Console */}
      {activeTab === 'console' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="Fast Navigation Hub"
            description="Direct shortcuts to common server administration and configuration workflows."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href={`/dashboard/${guildId}/pvc`}
              className="p-4 rounded-xl bg-[#121418] border border-[#1a1d24] hover:border-indigo-500/40 hover:bg-[#16181d] space-y-1 group transition-colors"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">Private Voice (PVC)</span>
              </div>
              <p className="text-[11px] text-[#8c949e]">Join-to-Create hubs, live telemetry, and personal presets</p>
            </Link>

            <Link
              href={`/dashboard/${guildId}/economy`}
              className="p-4 rounded-xl bg-[#121418] border border-[#1a1d24] hover:border-indigo-500/40 hover:bg-[#16181d] space-y-1 group transition-colors"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">Economy & Balances</span>
              </div>
              <p className="text-[11px] text-[#8c949e]">Inspect member net worth, daily rewards, and transactions</p>
            </Link>

            <Link
              href={`/dashboard/${guildId}/store`}
              className="p-4 rounded-xl bg-[#121418] border border-[#1a1d24] hover:border-indigo-500/40 hover:bg-[#16181d] space-y-1 group transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">Store Catalog</span>
              </div>
              <p className="text-[11px] text-[#8c949e]">Create custom shop items and role rewards</p>
            </Link>

            <Link
              href={`/dashboard/${guildId}/welcome`}
              className="p-4 rounded-xl bg-[#121418] border border-[#1a1d24] hover:border-indigo-500/40 hover:bg-[#16181d] space-y-1 group transition-colors"
            >
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">Welcome Designer</span>
              </div>
              <p className="text-[11px] text-[#8c949e]">Interactive embed designer, placeholders, and live test</p>
            </Link>

            <Link
              href={`/dashboard/${guildId}/permissions`}
              className="p-4 rounded-xl bg-[#121418] border border-[#1a1d24] hover:border-indigo-500/40 hover:bg-[#16181d] space-y-1 group transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">Permissions Matrix</span>
              </div>
              <p className="text-[11px] text-[#8c949e]">Profiles, role policies, and command ACL security</p>
            </Link>

            <Link
              href={`/dashboard/${guildId}/games`}
              className="p-4 rounded-xl bg-[#121418] border border-[#1a1d24] hover:border-indigo-500/40 hover:bg-[#16181d] space-y-1 group transition-colors"
            >
              <div className="flex items-center gap-2">
                <Dice5 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white group-hover:text-indigo-300">Minigames & Cooldowns</span>
              </div>
              <p className="text-[11px] text-[#8c949e]">Coinflip and Mines multiplier settings and delays</p>
            </Link>
          </div>
        </div>
      )}

      {/* TAB 3: Health */}
      {activeTab === 'health' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="Channel & Config Health Checks"
            description="Verification of linked Discord channels to guarantee bot commands and automated listeners function properly."
          />

          <div className="divide-y divide-[#1a1d24] border border-[#1a1d24] rounded-lg overflow-hidden bg-[#121418]">
            {healthChecks.map((hc) => (
              <div key={hc.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <span>{hc.name}</span>
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-mono rounded ${
                        hc.status === 'healthy'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : hc.status === 'stale'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-[#16181d] text-[#717882] border border-[#262a33]'
                      }`}
                    >
                      {hc.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-[#8c949e]">{hc.message}</div>
                </div>

                <Link
                  href={hc.fixPath}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14161b] hover:bg-[#1c1f26] border border-[#20242c] text-[#c1c7cd] hover:text-white transition-colors shrink-0"
                >
                  Configure
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

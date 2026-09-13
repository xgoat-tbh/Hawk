'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Terminal,
  ShieldAlert,
  Crown,
  Lock,
  CheckCircle2,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useGuildData } from '@/context/GuildContext';

export default function DevelopersPermitsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { guild, config } = useGuildData();

  const [activeTab, setActiveTab] = useState<'hierarchy' | 'permits' | 'protocols'>('hierarchy');
  const permits = config?.permissions?.permits || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#101217] dark:text-[#f0f2f5] flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-indigo-400" />
            Developers & Permits Matrix
          </h1>
          <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8c949e]">
            Wickbot-style authority matrix enforcing Bot Owner overlord priority and server owner administrative boundaries.
          </p>
        </div>
      </div>

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Bot Overlord"
          value="Tier 0"
          subtitle="Absolute system bypass"
          icon={Crown}
        />
        <StatCard
          title="Server Authority"
          value="Tier 1"
          subtitle="Guild sovereign admin"
          icon={ShieldAlert}
        />
        <StatCard
          title="Active Permits"
          value={permits.length}
          subtitle="Delegated authority tokens"
          icon={Lock}
        />
        <StatCard
          title="Enclave State"
          value="Active"
          subtitle="Zero-trust cryptographic auth"
          icon={Zap}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08] dark:border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'hierarchy'
              ? 'border-indigo-500 text-indigo-600 dark:text-white'
              : 'border-transparent text-gray-500 dark:text-[#717882] hover:text-gray-700 dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Crown className="w-4 h-4" />
          Authority Hierarchy
        </button>

        <button
          onClick={() => setActiveTab('permits')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'permits'
              ? 'border-indigo-500 text-indigo-600 dark:text-white'
              : 'border-transparent text-gray-500 dark:text-[#717882] hover:text-gray-700 dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Lock className="w-4 h-4" />
          Active Permits ({permits.length})
        </button>

        <button
          onClick={() => setActiveTab('protocols')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'protocols'
              ? 'border-indigo-500 text-indigo-600 dark:text-white'
              : 'border-transparent text-gray-500 dark:text-[#717882] hover:text-gray-700 dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Security Protocols
        </button>
      </div>

      {/* TAB 1: Authority Hierarchy */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tier 0: Bot Owner */}
            <div className="bg-white dark:bg-[#0c0d10] border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#101217] dark:text-white">Bot Owner Authority</h3>
                    <p className="text-xs text-gray-500 dark:text-[#8c949e]">Absolute system bypass & master access</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                  Tier 0 Overlord
                </span>
              </div>

              <div className="pt-3 border-t border-black/[0.08] dark:border-[#1a1d24] text-xs text-gray-700 dark:text-[#c1c7cd] space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Full command permit bypass across all servers</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Unrestricted database administration & migrations</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Exempt from economy cooldowns and role locks</span>
                </div>
              </div>
            </div>

            {/* Tier 1: Server Owner */}
            <div className="bg-white dark:bg-[#0c0d10] border border-amber-500/30 rounded-xl p-5 relative overflow-hidden space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#101217] dark:text-white">Server Owner Authority</h3>
                    <p className="text-xs text-gray-500 dark:text-[#8c949e]">Full control over this guild ({guild?.name || guildId})</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                  Tier 1 Sovereign
                </span>
              </div>

              <div className="pt-3 border-t border-black/[0.08] dark:border-[#1a1d24] text-xs text-gray-700 dark:text-[#c1c7cd] space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Unrestricted server dashboard & module configuration</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Can grant & revoke permits to roles and staff members</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Subordinate only to primary bot overlord</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Permits */}
      {activeTab === 'permits' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Active Guild Permits"
            description="Explicit delegations granting non-owners authorization to execute restricted commands or access dashboard areas."
          />

          {permits.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#717882]">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-[#101217] dark:text-white">No explicit custom permits</p>
              <p className="mt-1 text-gray-500 dark:text-[#717882]">Only Bot Owner (Tier 0) and Server Owner (Tier 1) have master authority.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-black/[0.08] dark:border-[#1a1d24] rounded-lg">
              <table className="w-full text-left text-xs text-gray-700 dark:text-[#c1c7cd]">
                <thead className="bg-gray-50 dark:bg-[#101216] border-b border-black/[0.08] dark:border-[#1a1d24] text-gray-500 dark:text-[#717882] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Target ID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Scope</th>
                    <th className="px-4 py-3">Granted By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.08] dark:divide-[#16181e] bg-white dark:bg-[#121418]">
                  {permits.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#16181d]/60">
                      <td className="px-4 py-3 font-mono text-[#101217] dark:text-white">{p.target_id}</td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-[#16181d] border border-black/[0.08] dark:border-[#262a33] text-gray-700 dark:text-gray-300">
                          {p.target_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-indigo-500 dark:text-indigo-400 font-medium">
                        {p.command_name || p.module_name || 'All'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-[#717882]">{p.granted_by || 'Owner'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Protocols */}
      {activeTab === 'protocols' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="System Security Architecture"
            description="Cryptographic and permission protocols enforced across the bot runtime."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] space-y-2">
              <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Overlord Bypass Invariant</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-[#8c949e] leading-relaxed">
                The bot owner user ID specified in environment variables bypasses all Discord role checks, cooldown timers, and channel permissions unconditionally.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] space-y-2">
              <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400 font-semibold text-xs">
                <Zap className="w-4 h-4" />
                <span>Owner Hierarchy Isolation</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-[#8c949e] leading-relaxed">
                Server owners can configure module behaviors for their own guild, but cannot modify bot-wide configurations, database schemas, or other servers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

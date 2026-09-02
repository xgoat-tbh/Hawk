'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  ShieldCheck,
  Zap,
  Users,
  Sliders,
  Sparkles,
  Coins,
  Radio,
  Lock,
  ArrowUpRight,
  Activity,
} from 'lucide-react';

export default function GuildOverviewPage() {
  const { guildId } = useParams() as { guildId: string };
  const { guild, bot, channels, roles, config } = useGuildData();

  const activeModules = [
    { name: 'Welcome Greetings', active: Boolean(config?.welcome?.config?.enabled), path: `/dashboard/${guildId}/welcome` },
    { name: 'Private Voice (PVC)', active: Boolean(config?.economy?.pvc_jtc_channel_id), path: `/dashboard/${guildId}/pvc` },
    { name: 'Passive Chat Income', active: Boolean(config?.economy?.passive_income), path: `/dashboard/${guildId}/economy` },
    { name: 'Media-Only Channels', active: (config?.mediaChannels || []).length > 0, path: `/dashboard/${guildId}/media` },
    { name: 'Sticky Notices', active: (config?.stickyMessages || []).length > 0, path: `/dashboard/${guildId}/sticky` },
    { name: 'Gaming LFG Alerts', active: (config?.gamePings || []).length > 0, path: `/dashboard/${guildId}/gaming` },
  ];

  const activeCount = activeModules.filter((m) => m.active).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Server Banner */}
      <div className="p-6 rounded-2xl bg-[#08080a] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {guild?.iconUrl ? (
              <img src={guild.iconUrl} alt={guild.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-bold font-mono text-white">
                {guild?.name ? guild.name.slice(0, 2).toUpperCase() : 'HK'}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">{guild?.name || 'Discord Server'}</h1>
              <StatusBadge status="Operational" variant="operational" />
            </div>
            <p className="text-xs text-white/40">
              Bot ID: {bot?.id || 'Connected'} • Discord Snowflake: {guildId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${guildId}/permissions`}
            className="btn-outline-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-white/60" />
            <span>Manage Access Rules</span>
          </Link>
          <Link
            href={`/dashboard/${guildId}/general`}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Bot</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#08080a] border border-white/[0.07] space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider">Bot Status</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-white">Online & Healthy</div>
          <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <span>● 38ms Gateway Latency</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#08080a] border border-white/[0.07] space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider">Active Modules</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-semibold text-white">{activeCount} of {activeModules.length} Active</div>
          <div className="text-[10px] font-mono text-white/40">
            {activeCount === activeModules.length ? 'Full features enabled' : 'Ready to configure'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#08080a] border border-white/[0.07] space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider">Discord Channels</span>
            <Users className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-sm font-semibold text-white">{channels.length} Channels</div>
          <div className="text-[10px] font-mono text-white/40">Synchronized via API</div>
        </div>

        <div className="p-4 rounded-xl bg-[#08080a] border border-white/[0.07] space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider">Server Roles</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-sm font-semibold text-white">{roles.length} Roles</div>
          <div className="text-[10px] font-mono text-white/40">Available for ACLs</div>
        </div>
      </div>

      {/* Feature Health Checklist */}
      <div className="space-y-3">
        <SectionHeader
          title="Module Health & Operational Status"
          description="Status overview of automated Discord features and background workers."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeModules.map((m) => (
            <Link
              key={m.name}
              href={m.path}
              className="p-3.5 rounded-xl bg-[#08080a] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02] flex items-center justify-between gap-3 transition-colors group"
            >
              <div className="space-y-0.5 overflow-hidden">
                <div className="text-xs font-medium text-white group-hover:text-white transition-colors">
                  {m.name}
                </div>
                <div className="text-[10px] font-mono">
                  {m.active ? (
                    <span className="text-emerald-400">Active & Enforcing</span>
                  ) : (
                    <span className="text-white/30">Not configured</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-white/30 group-hover:text-white transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Navigation Panel */}
      <div className="space-y-3">
        <SectionHeader
          title="Quick Operations Console"
          description="Direct jump links to key server controls."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href={`/dashboard/${guildId}/welcome`}
            className="p-4 rounded-xl bg-[#08080a] border border-white/[0.06] hover:border-white/20 space-y-1 group transition-colors"
          >
            <Sparkles className="w-4 h-4 text-white/60 group-hover:text-white" />
            <div className="text-xs font-medium text-white">Welcome Embed</div>
            <div className="text-[11px] text-white/40">Design live greeting cards</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/economy`}
            className="p-4 rounded-xl bg-[#08080a] border border-white/[0.06] hover:border-white/20 space-y-1 group transition-colors"
          >
            <Coins className="w-4 h-4 text-white/60 group-hover:text-white" />
            <div className="text-xs font-medium text-white">Economy & Store</div>
            <div className="text-[11px] text-white/40">Daily streaks & shop items</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/pvc`}
            className="p-4 rounded-xl bg-[#08080a] border border-white/[0.06] hover:border-white/20 space-y-1 group transition-colors"
          >
            <Radio className="w-4 h-4 text-white/60 group-hover:text-white" />
            <div className="text-xs font-medium text-white">Private Voice</div>
            <div className="text-[11px] text-white/40">Join-to-Create voice channels</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/permissions`}
            className="p-4 rounded-xl bg-[#08080a] border border-white/[0.06] hover:border-white/20 space-y-1 group transition-colors"
          >
            <Lock className="w-4 h-4 text-white/60 group-hover:text-white" />
            <div className="text-xs font-medium text-white">Security & Rules</div>
            <div className="text-[11px] text-white/40">ACLs & Audit logging</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { usePageEntrance } from '@/hooks/useAnimation';
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
} from 'lucide-react';

export default function GuildOverviewPage() {
  const { guildId } = useParams() as { guildId: string };
  const containerRef = usePageEntrance();
  const { guild, bot, channels, roles, config } = useGuildData();

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
  ];

  const staleIssues = healthChecks.filter((h) => h.status === 'stale');

  const activeModules = [
    { name: 'Private Voice (PVC)', active: Boolean(config?.economy?.pvc_jtc_channel_id), path: `/dashboard/${guildId}/pvc` },
    { name: 'Passive Chat Income', active: Boolean(config?.economy?.passive_income), path: `/dashboard/${guildId}/economy` },
    { name: 'Media-Only Channels', active: (config?.mediaChannels || []).length > 0, path: `/dashboard/${guildId}/media` },
    { name: 'Sticky Notices', active: (config?.stickyMessages || []).length > 0, path: `/dashboard/${guildId}/sticky` },
    { name: 'Gaming LFG Alerts', active: (config?.gamePings || []).length > 0, path: `/dashboard/${guildId}/gaming` },
  ];

  const activeCount = activeModules.filter((m) => m.active).length;

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      {/* Top Server Banner */}
      <div className="p-6 rounded-lg bg-[#0d0e10] border border-[#24272b] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-panel-soft">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-[#17191c] border border-[#24272b] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {guild?.iconUrl ? (
              <img src={guild.iconUrl} alt={guild.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-bold font-mono text-[#f1f2f3]">
                {guild?.name ? guild.name.slice(0, 2).toUpperCase() : 'HK'}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#f1f2f3] tracking-tight">{guild?.name || 'Discord Server'}</h1>
              <StatusBadge status="Operational" variant="operational" />
            </div>
            <p className="text-xs text-[#7e8389]">
              Bot ID: {bot?.id || 'Connected'} • Discord Snowflake: {guildId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${guildId}/permissions`}
            className="btn-outline-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-[#a9adb2]" />
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

      {/* Stale Configuration Warning Banner if any */}
      {staleIssues.length > 0 && (
        <div className="p-4 rounded-md bg-warning-soft border border-warning-border space-y-2">
          <div className="flex items-center gap-2 text-warning-text text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Configuration Attention Required ({staleIssues.length} issue{staleIssues.length > 1 ? 's' : ''} detected)</span>
          </div>
          <div className="space-y-1.5 pl-6">
            {staleIssues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between text-xs text-[#f1f2f3]">
                <span>{issue.name}: {issue.message}</span>
                <Link
                  href={issue.fixPath}
                  className="px-2 py-0.5 rounded bg-[#17191c] border border-[#24272b] text-[10px] font-mono text-warning-text hover:bg-[#25282c] flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Fix</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-animate-section>
        <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1">
          <div className="flex items-center justify-between text-[#7e8389]">
            <span className="text-[10px] font-mono uppercase tracking-wider">Bot Status</span>
            <Activity className="w-3.5 h-3.5 text-success" />
          </div>
          <div className="text-sm font-semibold text-[#f1f2f3]">Online & Healthy</div>
          <div className="text-[10px] font-mono text-success flex items-center gap-1">
            <span>● Gateway Latency: ~38ms</span>
          </div>
        </div>

        <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1">
          <div className="flex items-center justify-between text-[#7e8389]">
            <span className="text-[10px] font-mono uppercase tracking-wider">Active Modules</span>
            <Zap className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="text-sm font-semibold text-[#f1f2f3]">{activeCount} of {activeModules.length} Active</div>
          <div className="text-[10px] font-mono text-[#7e8389]">
            {activeCount === activeModules.length ? 'Full capabilities active' : 'Ready to configure'}
          </div>
        </div>

        <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1">
          <div className="flex items-center justify-between text-[#7e8389]">
            <span className="text-[10px] font-mono uppercase tracking-wider">Discord Channels</span>
            <Users className="w-3.5 h-3.5 text-info" />
          </div>
          <div className="text-sm font-semibold text-[#f1f2f3]">{channels.length} Channels</div>
          <div className="text-[10px] font-mono text-[#7e8389]">Synchronized via API</div>
        </div>

        <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-1">
          <div className="flex items-center justify-between text-[#7e8389]">
            <span className="text-[10px] font-mono uppercase tracking-wider">Server Roles</span>
            <ShieldCheck className="w-3.5 h-3.5 text-feature" />
          </div>
          <div className="text-sm font-semibold text-[#f1f2f3]">{roles.length} Roles</div>
          <div className="text-[10px] font-mono text-[#7e8389]">Available for policies</div>
        </div>
      </div>

      {/* Feature Health Checklist */}
      <div className="space-y-3" data-animate-section>
        <SectionHeader
          title="Module Health & Operational Status"
          description="Status overview of automated Discord features and background workers."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeModules.map((m) => (
            <Link
              key={m.name}
              href={m.path}
              className="p-3.5 rounded-md bg-[#0d0e10] border border-[#24272b] hover:border-[#3e434a] hover:bg-[#121417] flex items-center justify-between gap-3 transition-colors group"
            >
              <div className="space-y-0.5 overflow-hidden">
                <div className="text-xs font-medium text-[#f1f2f3] group-hover:text-white transition-colors">
                  {m.name}
                </div>
                <div className="text-[10px] font-mono">
                  {m.active ? (
                    <span className="text-success-text flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active & Enforcing
                    </span>
                  ) : (
                    <span className="text-[#7e8389]">Not configured</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[#7e8389] group-hover:text-[#f1f2f3] transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Operations Console */}
      <div className="space-y-3" data-animate-section>
        <SectionHeader
          title="Quick Operations Console"
          description="Direct jump links to key server controls."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href={`/dashboard/${guildId}/sticky`}
            className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] hover:border-[#3e434a] space-y-1 group transition-colors"
          >
            <Pin className="w-4 h-4 text-[#a9adb2] group-hover:text-[#f1f2f3]" />
            <div className="text-xs font-medium text-[#f1f2f3]">Sticky Notices</div>
            <div className="text-[11px] text-[#7e8389]">Persistent channel messages</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/economy`}
            className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] hover:border-[#3e434a] space-y-1 group transition-colors"
          >
            <Coins className="w-4 h-4 text-[#a9adb2] group-hover:text-[#f1f2f3]" />
            <div className="text-xs font-medium text-[#f1f2f3]">Economy & Store</div>
            <div className="text-[11px] text-[#7e8389]">Daily streaks & shop items</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/pvc`}
            className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] hover:border-[#3e434a] space-y-1 group transition-colors"
          >
            <Radio className="w-4 h-4 text-[#a9adb2] group-hover:text-[#f1f2f3]" />
            <div className="text-xs font-medium text-[#f1f2f3]">Private Voice</div>
            <div className="text-[11px] text-[#7e8389]">Join-to-Create voice channels</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/permissions`}
            className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] hover:border-[#3e434a] space-y-1 group transition-colors"
          >
            <Lock className="w-4 h-4 text-[#a9adb2] group-hover:text-[#f1f2f3]" />
            <div className="text-xs font-medium text-[#f1f2f3]">Security & Rules</div>
            <div className="text-[11px] text-[#7e8389]">ACLs & Audit logging</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

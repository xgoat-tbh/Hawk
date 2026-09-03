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
  HeartHandshake,
  Image as ImageIcon,
} from 'lucide-react';

export default function GuildOverviewPage() {
  const { guildId } = useParams() as { guildId: string };
  const { guild, bot, channels, roles, config, loading } = useGuildData();
  const containerRef = usePageEntrance(!loading);

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
    },
    {
      name: 'Private Voice (PVC)',
      active: Boolean(config?.economy?.pvc_jtc_channel_id),
      description: 'Join-to-Create dynamic temporary voice rooms',
      path: `/dashboard/${guildId}/pvc`,
    },
    {
      name: 'Economy & Rewards',
      active: Boolean(config?.economy?.daily_reward_amount || config?.economy?.passive_income),
      description: 'Streaks, chat rewards, and currency system',
      path: `/dashboard/${guildId}/economy`,
    },
    {
      name: 'Media-Only Channels',
      active: (config?.mediaChannels || []).length > 0,
      description: 'Enforces media attachments & auto-threads',
      path: `/dashboard/${guildId}/media`,
    },
    {
      name: 'Sticky Notices',
      active: (config?.stickyMessages || []).length > 0,
      description: 'Pinned bottom messages per channel',
      path: `/dashboard/${guildId}/sticky`,
    },
    {
      name: 'Gaming LFG Alerts',
      active: (config?.gamePings || []).length > 0,
      description: 'Voice room activity pings for players',
      path: `/dashboard/${guildId}/gaming`,
    },
  ];

  const activeCount = activeModules.filter((m) => m.active).length;

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      {/* Top Server Banner */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#0d0e10] border border-[#1f2226] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-lg bg-[#121417] border border-[#1f2226] flex items-center justify-center overflow-hidden shrink-0 shadow-tactile-btn">
            {guild?.iconUrl ? (
              <img src={guild.iconUrl} alt={guild.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold font-mono text-[#ededed]">
                {guild?.name ? guild.name.slice(0, 2).toUpperCase() : 'HK'}
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-[#ededed] tracking-tight">
                {guild?.name || 'Discord Server'}
              </h1>
              <StatusBadge status="OPERATIONAL" variant="operational" />
            </div>
            <p className="text-[11px] text-[#6e747c] font-mono">
              Snowflake: {guildId} • Bot: {bot?.username || 'Hawk'} ({bot?.id ? `ID ${bot.id}` : 'Connected'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href={`/dashboard/${guildId}/permissions`}
            className="btn-outline-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-[#949aa2]" />
            <span>Manage Access</span>
          </Link>
          <Link
            href={`/dashboard/${guildId}/general`}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Bot</span>
          </Link>
        </div>
      </div>

      {/* Stale Configuration Warning Banner if any */}
      {staleIssues.length > 0 && (
        <div className="p-3.5 rounded-lg bg-warning-soft border border-warning-border space-y-2">
          <div className="flex items-center gap-2 text-warning-text text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Configuration Alert ({staleIssues.length} issue{staleIssues.length > 1 ? 's' : ''} detected)</span>
          </div>
          <div className="space-y-1.5 pl-6">
            {staleIssues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between text-xs text-[#ededed]">
                <span>{issue.name}: {issue.message}</span>
                <Link
                  href={issue.fixPath}
                  className="px-2 py-0.5 rounded bg-[#121417] border border-[#1f2226] text-[10px] font-mono text-warning-text hover:bg-[#17191c] flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Resolve</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-animate-section>
        <div className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] space-y-1">
          <div className="flex items-center justify-between text-[#6e747c]">
            <span className="text-[10px] font-mono uppercase tracking-wider">Gateway Status</span>
            <Activity className="w-3.5 h-3.5 text-success" />
          </div>
          <div className="text-sm font-semibold text-[#ededed]">Connected</div>
          <div className="text-[10px] font-mono text-success flex items-center gap-1">
            <span>● 0 Dropped Packets</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] space-y-1">
          <div className="flex items-center justify-between text-[#6e747c]">
            <span className="text-[10px] font-mono uppercase tracking-wider">Active Modules</span>
            <Zap className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="text-sm font-semibold text-[#ededed]">{activeCount} of {activeModules.length} Active</div>
          <div className="text-[10px] font-mono text-[#6e747c]">
            {activeCount === activeModules.length ? 'All modules active' : 'Ready for deployment'}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] space-y-1">
          <div className="flex items-center justify-between text-[#6e747c]">
            <span className="text-[10px] font-mono uppercase tracking-wider">Discord Channels</span>
            <Users className="w-3.5 h-3.5 text-info" />
          </div>
          <div className="text-sm font-semibold text-[#ededed]">{channels.length} Synchronized</div>
          <div className="text-[10px] font-mono text-[#6e747c]">Available for routing</div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] space-y-1">
          <div className="flex items-center justify-between text-[#6e747c]">
            <span className="text-[10px] font-mono uppercase tracking-wider">Server Roles</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#949aa2]" />
          </div>
          <div className="text-sm font-semibold text-[#ededed]">{roles.length} Roles</div>
          <div className="text-[10px] font-mono text-[#6e747c]">Mapped for permissions</div>
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
              className="p-3 rounded-lg bg-[#0d0e10] border border-[#1f2226] hover:border-[#2a2d33] hover:bg-[#121417] flex items-center justify-between gap-3 transition-colors group"
            >
              <div className="space-y-0.5 overflow-hidden">
                <div className="text-xs font-medium text-[#ededed] group-hover:text-white transition-colors">
                  {m.name}
                </div>
                <div className="text-[10px] text-[#6e747c] truncate">
                  {m.description}
                </div>
                <div className="text-[10px] font-mono pt-0.5">
                  {m.active ? (
                    <span className="text-success-text flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-success" />
                      Active & Enforcing
                    </span>
                  ) : (
                    <span className="text-[#6e747c]">Not configured</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 text-[#6e747c] group-hover:text-[#ededed] transition-colors shrink-0">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Operations Console */}
      <div className="space-y-3" data-animate-section>
        <SectionHeader
          title="Quick Operations Console"
          description="Direct access to primary server modules and features."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link
            href={`/dashboard/${guildId}/welcome`}
            className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] hover:border-[#2a2d33] hover:bg-[#121417] space-y-1 group transition-colors"
          >
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#949aa2] group-hover:text-success" />
              <div className="text-xs font-medium text-[#ededed]">Welcome Greetings</div>
            </div>
            <div className="text-[11px] text-[#6e747c]">Interactive embed designer & live preview</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/pvc`}
            className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] hover:border-[#2a2d33] hover:bg-[#121417] space-y-1 group transition-colors"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#949aa2] group-hover:text-[#ededed]" />
              <div className="text-xs font-medium text-[#ededed]">Private Voice (PVC)</div>
            </div>
            <div className="text-[11px] text-[#6e747c]">Dynamic join-to-create voice channels</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/economy`}
            className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] hover:border-[#2a2d33] hover:bg-[#121417] space-y-1 group transition-colors"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#949aa2] group-hover:text-[#ededed]" />
              <div className="text-xs font-medium text-[#ededed]">Economy & Rewards</div>
            </div>
            <div className="text-[11px] text-[#6e747c]">Daily streaks, passive income & store</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/permissions`}
            className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] hover:border-[#2a2d33] hover:bg-[#121417] space-y-1 group transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#949aa2] group-hover:text-[#ededed]" />
              <div className="text-xs font-medium text-[#ededed]">Security & Rules</div>
            </div>
            <div className="text-[11px] text-[#6e747c]">Role policies, command overrides & audit log</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/sticky`}
            className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] hover:border-[#2a2d33] hover:bg-[#121417] space-y-1 group transition-colors"
          >
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-[#949aa2] group-hover:text-[#ededed]" />
              <div className="text-xs font-medium text-[#ededed]">Sticky Notices</div>
            </div>
            <div className="text-[11px] text-[#6e747c]">Persistent channel messages</div>
          </Link>

          <Link
            href={`/dashboard/${guildId}/media`}
            className="p-3.5 rounded-lg bg-[#0d0e10] border border-[#1f2226] hover:border-[#2a2d33] hover:bg-[#121417] space-y-1 group transition-colors"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#949aa2] group-hover:text-[#ededed]" />
              <div className="text-xs font-medium text-[#ededed]">Media Channels</div>
            </div>
            <div className="text-[11px] text-[#6e747c]">Auto-moderated media feeds & auto-threads</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

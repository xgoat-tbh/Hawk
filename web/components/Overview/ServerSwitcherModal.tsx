'use client';

import React from 'react';
import Link from 'next/link';
import { X, Server, Check, ArrowRight } from 'lucide-react';
import { useGuildData } from '@/context/GuildContext';

interface ServerSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberCount?: number;
  modulesActive?: number;
}

export function ServerSwitcherModal({
  isOpen,
  onClose,
  memberCount,
  modulesActive,
}: ServerSwitcherModalProps) {
  const { guildId: _guildId, guild, config } = useGuildData();

  const activeCount = React.useMemo(() => {
    if (typeof modulesActive === 'number') return modulesActive;
    let count = 0;
    if (config?.welcome?.config?.enabled && config?.welcome?.config?.channel_id) count++;
    if (config?.economy?.pvc_jtc_channel_id) count++;
    if (config?.economy?.daily_reward_amount || config?.economy?.passive_income) count++;
    if ((config?.storeItems || []).length > 0) count++;
    if ((config?.stickyMessages || []).length > 0) count++;
    if ((config?.gamePings || []).length > 0) count++;
    if ((config?.incomeRoles || []).length > 0) count++;
    if (config?.suggestions?.submission_channel_id) count++;
    if (config?.confessions?.submission_channel_id) count++;
    return count;
  }, [modulesActive, config]);

  const memberDisplay = (
    memberCount ??
    guild?.approximateMemberCount ??
    guild?.memberCount ??
    0
  ).toLocaleString();

  const serverInitials = (guild?.name || 'AMO')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#121418] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#101217] dark:text-[#ededed]">Switch Discord Server</h3>
              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">Select a server managed by Amo Bot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#94a3b8] hover:text-[#101217] dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server List */}
        <div className="p-4 space-y-2">
          <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-[#17191c] border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {guild?.iconUrl ? (
                <img
                  src={guild.iconUrl}
                  alt={guild.name}
                  className="w-9 h-9 rounded-xl object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold flex items-center justify-center text-xs">
                  {serverInitials}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#101217] dark:text-[#ededed]">
                    {guild?.name || 'Amo India'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                  {memberDisplay} members • {activeCount} modules active
                </div>
              </div>
            </div>

            <span className="p-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Check className="w-4 h-4" />
            </span>
          </div>

          <Link
            href="/dashboard"
            onClick={onClose}
            className="w-full mt-3 p-3 rounded-xl border border-dashed border-black/[0.12] dark:border-white/[0.12] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex items-center justify-center gap-2 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] transition-colors"
          >
            <span>Browse All Guilds</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Terminal,
  ShieldAlert,
  Crown,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useGuildData } from '@/context/GuildContext';

export default function DevelopersPermitsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { guild, config } = useGuildData();

  const permits = config?.permissions?.permits || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#f0f2f5] flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-indigo-400" />
          Developers & Permits Matrix
        </h1>
        <p className="mt-1 text-xs text-[#8c949e]">
          Wickbot-style authority matrix enforcing Bot Owner overlord priority and server owner administrative boundaries.
        </p>
      </div>

      {/* Top Hierarchy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier 0: Bot Owner */}
        <div className="bg-[#0c0d10] border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
              Primary Overlord (Tier 0)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Bot Owner Authority</h3>
              <p className="text-xs text-[#8c949e]">Absolute system bypass & master access</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1a1d24] text-xs text-[#c1c7cd] space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Full command permit bypass across all servers</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unrestricted database administration & migrations</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Exempt from economy cooldowns and role locks</span>
            </div>
          </div>
        </div>

        {/* Tier 1: Server Owner */}
        <div className="bg-[#0c0d10] border border-amber-500/30 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
              Secondary Authority (Tier 1)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Server Owner Authority</h3>
              <p className="text-xs text-[#8c949e]">Full control over this guild ({guild?.name || guildId})</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1a1d24] text-xs text-[#c1c7cd] space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unrestricted server dashboard & module configuration</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Can grant & revoke permits to roles and staff members</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Subordinate only to primary bot overlord</span>
            </div>
          </div>
        </div>
      </div>

      {/* Permits Table */}
      <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-4">
        <SectionHeader
          title="Active Guild Permits"
          description="Explicit delegations granting non-owners authorization to execute restricted commands or access dashboard areas."
        />

        {permits.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#717882]">
            <Lock className="w-6 h-6 mx-auto mb-2 opacity-40" />
            No explicit custom permits configured. Only Bot Owner and Server Owner have master authority.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#c1c7cd]">
              <thead className="bg-[#101216] border-b border-[#1a1d24] text-[#717882] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Granted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#16181e]">
                {permits.map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#121418]/60">
                    <td className="px-4 py-3 font-mono text-white">{p.target_id}</td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#16181d] border border-[#262a33]">
                        {p.target_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-indigo-400 font-medium">
                      {p.command_name || p.module_name || 'All'}
                    </td>
                    <td className="px-4 py-3 text-[#717882]">{p.granted_by || 'Owner'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

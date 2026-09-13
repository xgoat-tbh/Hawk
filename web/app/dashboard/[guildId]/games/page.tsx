'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Dice5,
  Bomb,
  Coins,
  Clock,
  Save,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { useToast } from '@/components/ui/Toast';

interface GameCooldowns {
  coinflip: number;
  mines: number;
  work: number;
  slut: number;
  crime: number;
  rob: number;
}

export default function GamesDashboardPage() {
  const { guildId } = useParams() as { guildId: string };
  const toast = useToast();

  const [cooldowns, setCooldowns] = useState<GameCooldowns>({
    coinflip: 15,
    mines: 15,
    work: 3600,
    slut: 3600,
    crime: 7200,
    rob: 86400,
  });

  const [saving, setSaving] = useState(false);

  const fetchCooldowns = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/games/config`);
      if (res.ok) {
        const data = await res.json();
        setCooldowns(data.cooldowns);
      }
    } catch (err) {
      console.error('Failed to fetch game cooldowns:', err);
    }
  }, [guildId]);

  useEffect(() => {
    fetchCooldowns();
  }, [fetchCooldowns]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/games/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cooldowns),
      });

      if (res.ok) {
        toast.success('Game cooldowns updated successfully!');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save cooldowns');
      }
    } catch {
      toast.error('Network error saving cooldowns');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#101217] dark:text-[#f0f2f5] flex items-center gap-2.5">
            <Dice5 className="w-5 h-5 text-indigo-400" />
            Minigames & Cooldown Settings
          </h1>
          <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8c949e]">
            Fine-tune turn cooldowns for casino minigames (Coinflip, Mines) and economy jobs.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Cooldowns'}
        </button>
      </div>

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Coinflip Multiplier"
          value="2.00x"
          subtitle="Fixed doubling payout"
          icon={Coins}
        />
        <StatCard
          title="Mines Max Multiplier"
          value="8.46x"
          subtitle="Dynamic 3x3 grid scaling"
          icon={Bomb}
        />
        <StatCard
          title="Coinflip Cooldown"
          value={`${cooldowns.coinflip}s`}
          subtitle="Wait time between turns"
          icon={Clock}
        />
        <StatCard
          title="Mines Cooldown"
          value={`${cooldowns.mines}s`}
          subtitle="Wait time between games"
          icon={Clock}
        />
      </div>

      {/* Minigames Cooldowns Card */}
      <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
        <SectionHeader
          title="Casino Minigame Cooldowns"
          description="Control the mandatory delay between user bets to prevent bot spamming and rapid bankruptcies."
        />

        <SettingRow
          label="Coinflip Cooldown (seconds)"
          description="Seconds a member must wait after running !coinflip before playing again (default 15s)."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={3600}
              value={cooldowns.coinflip}
              onChange={(e) => setCooldowns((prev) => ({ ...prev, coinflip: Number(e.target.value) }))}
              className="w-28 px-3 py-1.5 text-xs bg-white dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-[#717882]">seconds</span>
          </div>
        </SettingRow>

        <SettingRow
          label="Mines Cooldown (seconds)"
          description="Seconds between starting new !mines grid sessions (default 15s)."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={3600}
              value={cooldowns.mines}
              onChange={(e) => setCooldowns((prev) => ({ ...prev, mines: Number(e.target.value) }))}
              className="w-28 px-3 py-1.5 text-xs bg-white dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-[#717882]">seconds</span>
          </div>
        </SettingRow>
      </div>

      {/* Economy Jobs Cooldowns Card */}
      <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
        <SectionHeader
          title="Job & Activity Cooldowns"
          description="Set cooldown durations for community earning commands."
        />

        <SettingRow
          label="Work Command (!work)"
          description="Cooldown between completing shifts."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={86400}
              value={cooldowns.work}
              onChange={(e) => setCooldowns((prev) => ({ ...prev, work: Number(e.target.value) }))}
              className="w-28 px-3 py-1.5 text-xs bg-white dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-[#717882]">seconds ({Math.round(cooldowns.work / 60)}m)</span>
          </div>
        </SettingRow>

        <SettingRow
          label="Slut Command (!slut)"
          description="Cooldown between slut actions."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={86400}
              value={cooldowns.slut}
              onChange={(e) => setCooldowns((prev) => ({ ...prev, slut: Number(e.target.value) }))}
              className="w-28 px-3 py-1.5 text-xs bg-white dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-[#717882]">seconds ({Math.round(cooldowns.slut / 60)}m)</span>
          </div>
        </SettingRow>

        <SettingRow
          label="Crime Command (!crime)"
          description="Cooldown between crime attempts."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={86400}
              value={cooldowns.crime}
              onChange={(e) => setCooldowns((prev) => ({ ...prev, crime: Number(e.target.value) }))}
              className="w-28 px-3 py-1.5 text-xs bg-white dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-[#717882]">seconds ({Math.round(cooldowns.crime / 60)}m)</span>
          </div>
        </SettingRow>

        <SettingRow
          label="Rob Command (!rob)"
          description="Cooldown before user can attempt another heist."
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={86400}
              value={cooldowns.rob}
              onChange={(e) => setCooldowns((prev) => ({ ...prev, rob: Number(e.target.value) }))}
              className="w-28 px-3 py-1.5 text-xs bg-white dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg text-[#101217] dark:text-[#ededed] focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-[#717882]">seconds ({Math.round(cooldowns.rob / 3600)}h)</span>
          </div>
        </SettingRow>
      </div>

      {/* Mines Mechanics Reference Card */}
      <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-4 shadow-xs">
        <SectionHeader
          title="Mines Grid Mechanics Reference"
          description="Real-time mathematical multiplier table applied across 3x3 interactive button grid."
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-gray-50 dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg">
            <span className="text-[10px] text-[#717882] uppercase tracking-wider block">1 Bomb</span>
            <span className="text-sm font-bold text-emerald-400">1.06x ~ 2.11x</span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg">
            <span className="text-[10px] text-[#717882] uppercase tracking-wider block">3 Bombs</span>
            <span className="text-sm font-bold text-emerald-400">1.41x ~ 4.23x</span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg">
            <span className="text-[10px] text-[#717882] uppercase tracking-wider block">5 Bombs</span>
            <span className="text-sm font-bold text-emerald-400">2.11x ~ 8.46x</span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-[#121418] border border-black/[0.08] dark:border-[#20242c] rounded-lg">
            <span className="text-[10px] text-[#717882] uppercase tracking-wider block">Inactivity Timeout</span>
            <span className="text-sm font-bold text-indigo-400">5 minutes auto</span>
          </div>
        </div>
      </div>
    </div>
  );
}

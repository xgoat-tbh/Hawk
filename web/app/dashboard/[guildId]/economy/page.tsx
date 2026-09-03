'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { Coins, Flame, MessageSquareText } from 'lucide-react';

interface EconomyFormData {
  currencySymbol: string;
  startBalance: number;
  dailyRewardAmount: number;
  dailyStreakBonus: number;
  passiveIncome: boolean;
  passiveAmount: number;
}

export default function EconomySettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { config, updateConfigLocally, loading } = useGuildData();
  const containerRef = usePageEntrance(!loading);

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
    initialData: initialFormData,
    onSave: async (formValues) => {
      const payload = {
        currency_symbol: formValues.currencySymbol.trim() || '$',
        start_balance: formValues.startBalance,
        daily_reward_amount: formValues.dailyRewardAmount,
        daily_streak_bonus: formValues.dailyStreakBonus,
        passive_income: formValues.passiveIncome,
        passive_amount: formValues.passiveAmount,
      };

      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'economy',
          data: payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save economy configuration.');
      }

      updateConfigLocally('economy', {
        ...(config?.economy || {}),
        ...payload,
      });

      return formValues;
    },
  });

  const current = draft || initialFormData;

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17191c] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#ededed] tracking-tight flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#949aa2]" />
            <span>Economy & Daily Rewards</span>
          </h1>
          <p className="text-xs text-[#6e747c] mt-0.5">
            Configure server currency symbol, starting wallet cash, daily streaks, and passive message rewards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => save()}
          disabled={saveState === 'saving' || !isDirty}
          className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{saveState === 'saving' ? 'Saving...' : saveState === 'success' ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* Currency & Base Wallet */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Currency & Initial Balances"
            description="Control how currency is denominated and initial funds for new members."
            icon={<Coins className="w-3.5 h-3.5 text-[#6e747c]" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Currency Symbol"
              description="The symbol or short code placed adjacent to economy values (e.g. $, 🪙, credits)."
              badge="Denomination"
            >
              <input
                type="text"
                value={current.currencySymbol}
                maxLength={5}
                onChange={(e) => setField('currencySymbol', e.target.value)}
                className="glass-input font-mono text-xs w-28 text-center"
                placeholder="$"
              />
            </SettingRow>

            <SettingRow
              label="Starting Wallet Balance"
              description="Initial currency amount granted to a member when their wallet is first initialized."
              badge="Base"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#6e747c]">{current.currencySymbol}</span>
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  value={current.startBalance}
                  onChange={(e) => setField('startBalance', Number(e.target.value))}
                  className="glass-input font-mono text-xs w-36"
                />
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Daily Claims & Streaks */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Daily Claims & Activity Streaks"
            description="Incentivize daily retention and progressive activity bonuses."
            icon={<Flame className="w-3.5 h-3.5 text-[#6e747c]" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Base Daily Reward"
              description="The guaranteed reward claimed every 24 hours via the !daily command."
              badge="Daily"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#6e747c]">{current.currencySymbol}</span>
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  value={current.dailyRewardAmount}
                  onChange={(e) => setField('dailyRewardAmount', Number(e.target.value))}
                  className="glass-input font-mono text-xs w-36"
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Daily Streak Multiplier Bonus"
              description="Incremental currency added to the daily reward for each consecutive day claimed."
              badge="Bonus"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#6e747c]">+{current.currencySymbol}</span>
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  value={current.dailyStreakBonus}
                  onChange={(e) => setField('dailyStreakBonus', Number(e.target.value))}
                  className="glass-input font-mono text-xs w-36"
                />
                <span className="text-[11px] text-[#6e747c]">/ day streak</span>
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Passive Chat Income */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Passive Chat Income"
            description="Reward members automatically when they actively converse in non-restricted text channels."
            icon={<MessageSquareText className="w-3.5 h-3.5 text-[#6e747c]" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Enable Chat Message Income"
              description="When active, members earn a fixed currency rate per eligible message (governed by internal 60s cooldowns)."
              badge={current.passiveIncome ? 'Active' : 'Disabled'}
              badgeVariant={current.passiveIncome ? 'success' : 'neutral'}
            >
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={current.passiveIncome}
                  onChange={(e) => setField('passiveIncome', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#121417] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#ededed] after:border-[#1f2226] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success border border-[#1f2226]"></div>
              </label>
            </SettingRow>

            {current.passiveIncome && (
              <SettingRow
                label="Reward Per Eligible Message"
                description="The amount of currency awarded per chat message."
                badge="Rate"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#6e747c]">{current.currencySymbol}</span>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={current.passiveAmount}
                    onChange={(e) => setField('passiveAmount', Number(e.target.value))}
                    className="glass-input font-mono text-xs w-36"
                  />
                  <span className="text-[11px] text-[#6e747c]">/ message</span>
                </div>
              </SettingRow>
            )}
          </div>
        </div>
      </div>

      <SaveBar
        isDirty={isDirty}
        saveState={saveState}
        onSave={save}
        onReset={reset}
        error={saveError}
      />
    </div>
  );
}

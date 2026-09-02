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
  const containerRef = usePageEntrance();
  const { config, updateConfigLocally } = useGuildData();

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
        currency_symbol: formValues.currencySymbol,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#a9adb2]" />
            <span>Economy & Daily Rewards</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
            Configure server currency symbol, starting wallet cash, daily streaks, and passive message rewards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => save()}
          disabled={saveState === 'saving' || !isDirty}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{saveState === 'saving' ? 'Saving...' : saveState === 'success' ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* Currency & Base Balances */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Currency & Starting Wallets"
            description="Base currency symbol and default new member funds."
            icon={<Coins className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Currency Symbol"
              description="Symbol or short code prefix for economy commands (e.g. $, 🪙, credits)."
            >
              <input
                type="text"
                maxLength={5}
                value={current.currencySymbol}
                onChange={(e) => setField('currencySymbol', e.target.value)}
                className="glass-input font-mono text-xs w-28 text-center"
                placeholder="$"
              />
            </SettingRow>

            <SettingRow
              label="Starting Wallet Cash"
              description="Initial balance granted to new members upon joining the server."
            >
              <div className="relative w-36">
                <input
                  type="number"
                  min={0}
                  value={current.startBalance}
                  onChange={(e) => setField('startBalance', parseInt(e.target.value, 10) || 0)}
                  className="glass-input font-mono text-xs pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#7e8389]">
                  {current.currencySymbol}
                </span>
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Daily Streaks & Rewards */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Daily Streaks & Activity Rewards"
            description="Configures !daily claim amounts and consecutive day streak multipliers."
            icon={<Flame className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Base Daily Reward"
              description="Base cash granted when running the !daily command."
            >
              <div className="relative w-36">
                <input
                  type="number"
                  min={0}
                  value={current.dailyRewardAmount}
                  onChange={(e) => setField('dailyRewardAmount', parseInt(e.target.value, 10) || 0)}
                  className="glass-input font-mono text-xs pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#7e8389]">
                  {current.currencySymbol}
                </span>
              </div>
            </SettingRow>

            <SettingRow
              label="Consecutive Streak Bonus"
              description="Additional bonus cash added to daily reward for each consecutive daily claim."
            >
              <div className="relative w-36">
                <input
                  type="number"
                  min={0}
                  value={current.dailyStreakBonus}
                  onChange={(e) => setField('dailyStreakBonus', parseInt(e.target.value, 10) || 0)}
                  className="glass-input font-mono text-xs pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#7e8389]">
                  {current.currencySymbol}
                </span>
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Passive Message Income */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Passive Chat Income"
            description="Automated wallet rewards for active conversation in chat channels."
            icon={<MessageSquareText className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Enable Passive Chat Income"
              description="Grants currency to members for active conversation messages (1-minute anti-spam cooldown)."
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
                <div className="w-10 h-5 bg-[#17191c] border border-[#24272b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#f1f2f3] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success peer-checked:after:bg-black"></div>
              </label>
            </SettingRow>

            {current.passiveIncome && (
              <SettingRow
                label="Reward Amount Per Message"
                description="Amount added to member wallet per message sent in eligible text channels."
              >
                <div className="relative w-36">
                  <input
                    type="number"
                    min={1}
                    value={current.passiveAmount}
                    onChange={(e) => setField('passiveAmount', parseInt(e.target.value, 10) || 1)}
                    className="glass-input font-mono text-xs pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#7e8389]">
                    {current.currencySymbol}
                  </span>
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

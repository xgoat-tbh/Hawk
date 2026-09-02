'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useGuildData } from '@/context/GuildContext';
import { Coins, Flame, MessageSquareText } from 'lucide-react';

export default function EconomySettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { config, updateConfigLocally } = useGuildData();

  // Form State
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [startBalance, setStartBalance] = useState(0);
  const [dailyRewardAmount, setDailyRewardAmount] = useState(1000);
  const [dailyStreakBonus, setDailyStreakBonus] = useState(100);
  const [passiveIncome, setPassiveIncome] = useState(false);
  const [passiveAmount, setPassiveAmount] = useState(10);

  // Original State
  const [original, setOriginal] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (config?.economy) {
      const eco = config.economy;
      setCurrencySymbol(eco.currency_symbol || '$');
      setStartBalance(Number(eco.start_balance) || 0);
      setDailyRewardAmount(Number(eco.daily_reward_amount) || 1000);
      setDailyStreakBonus(Number(eco.daily_streak_bonus) || 100);
      setPassiveIncome(Boolean(eco.passive_income));
      setPassiveAmount(Number(eco.passive_amount) || 10);

      setOriginal({
        currencySymbol: eco.currency_symbol || '$',
        startBalance: Number(eco.start_balance) || 0,
        dailyRewardAmount: Number(eco.daily_reward_amount) || 1000,
        dailyStreakBonus: Number(eco.daily_streak_bonus) || 100,
        passiveIncome: Boolean(eco.passive_income),
        passiveAmount: Number(eco.passive_amount) || 10,
      });
    }
  }, [config]);

  const hasChanges =
    original &&
    (currencySymbol !== original.currencySymbol ||
      startBalance !== original.startBalance ||
      dailyRewardAmount !== original.dailyRewardAmount ||
      dailyStreakBonus !== original.dailyStreakBonus ||
      passiveIncome !== original.passiveIncome ||
      passiveAmount !== original.passiveAmount);

  const handleReset = () => {
    if (!original) return;
    setCurrencySymbol(original.currencySymbol);
    setStartBalance(original.startBalance);
    setDailyRewardAmount(original.dailyRewardAmount);
    setDailyStreakBonus(original.dailyStreakBonus);
    setPassiveIncome(original.passiveIncome);
    setPassiveAmount(original.passiveAmount);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        currency_symbol: currencySymbol,
        start_balance: startBalance,
        daily_reward_amount: dailyRewardAmount,
        daily_streak_bonus: dailyStreakBonus,
        passive_income: passiveIncome,
        passive_amount: passiveAmount,
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
        throw new Error(errData.error || 'Failed to save');
      }

      updateConfigLocally('economy', {
        ...(config?.economy || {}),
        ...payload,
      });

      setOriginal({
        currencySymbol,
        startBalance,
        dailyRewardAmount,
        dailyStreakBonus,
        passiveIncome,
        passiveAmount,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Coins className="w-4 h-4 text-white/80" />
            <span>Economy & Daily Rewards</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Configure server currency symbol, starting wallet cash, daily streaks, and passive message rewards.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* Currency & Base Balances */}
        <div className="space-y-1">
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
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
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
                  value={startBalance}
                  onChange={(e) => setStartBalance(parseInt(e.target.value, 10) || 0)}
                  className="glass-input font-mono text-xs pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-white/40">
                  {currencySymbol}
                </span>
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Daily Streaks & Rewards */}
        <div className="space-y-1">
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
                  value={dailyRewardAmount}
                  onChange={(e) => setDailyRewardAmount(parseInt(e.target.value, 10) || 0)}
                  className="glass-input font-mono text-xs pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-white/40">
                  {currencySymbol}
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
                  value={dailyStreakBonus}
                  onChange={(e) => setDailyStreakBonus(parseInt(e.target.value, 10) || 0)}
                  className="glass-input font-mono text-xs pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-white/40">
                  {currencySymbol}
                </span>
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Passive Message Income */}
        <div className="space-y-1">
          <SectionHeader
            title="Passive Chat Income"
            description="Automated wallet rewards for active conversation in chat channels."
            icon={<MessageSquareText className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Enable Passive Chat Income"
              description="Grants currency to members for active conversation messages (1-minute anti-spam cooldown)."
              badge={passiveIncome ? 'Active' : 'Disabled'}
              badgeVariant={passiveIncome ? 'success' : 'neutral'}
            >
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={passiveIncome}
                  onChange={(e) => setPassiveIncome(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
              </label>
            </SettingRow>

            {passiveIncome && (
              <SettingRow
                label="Reward Amount Per Message"
                description="Amount added to member wallet per message sent in eligible text channels."
              >
                <div className="relative w-36">
                  <input
                    type="number"
                    min={1}
                    value={passiveAmount}
                    onChange={(e) => setPassiveAmount(parseInt(e.target.value, 10) || 1)}
                    className="glass-input font-mono text-xs pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-white/40">
                    {currencySymbol}
                  </span>
                </div>
              </SettingRow>
            )}
          </div>
        </div>
      </div>

      <SaveBar
        hasChanges={Boolean(hasChanges)}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={handleReset}
        error={saveError}
        success={saveSuccess}
      />
    </div>
  );
}

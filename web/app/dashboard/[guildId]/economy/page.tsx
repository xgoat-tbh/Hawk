'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SaveBar } from '@/components/SaveBar';
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
            Configure server currency, starting wallet balances, daily streak bonuses, and passive chat income.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Currency & Base Balance */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Currency & Starting Balance</h3>
              <p className="text-[11px] text-white/40">Base currency symbol and default new member cash.</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Currency Symbol</label>
              <input
                type="text"
                maxLength={5}
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="glass-input font-mono text-xs w-24"
                placeholder="$"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Starting Wallet Balance</label>
              <input
                type="number"
                min={0}
                value={startBalance}
                onChange={(e) => setStartBalance(parseInt(e.target.value, 10) || 0)}
                className="glass-input font-mono text-xs max-w-xs"
              />
            </div>
          </div>
        </div>

        {/* Daily Streaks */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Daily Streaks & Rewards</h3>
              <p className="text-[11px] text-white/40">Amount granted for executing !daily each consecutive day.</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Base Daily Reward</label>
              <input
                type="number"
                min={0}
                value={dailyRewardAmount}
                onChange={(e) => setDailyRewardAmount(parseInt(e.target.value, 10) || 0)}
                className="glass-input font-mono text-xs max-w-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Streak Multiplier Bonus (Per Day)</label>
              <input
                type="number"
                min={0}
                value={dailyStreakBonus}
                onChange={(e) => setDailyStreakBonus(parseInt(e.target.value, 10) || 0)}
                className="glass-input font-mono text-xs max-w-xs"
              />
            </div>
          </div>
        </div>

        {/* Passive Chat Income */}
        <div className="glass-card p-5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                <MessageSquareText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-medium text-xs text-white uppercase tracking-wider">Passive Chat Activity Income</h3>
                <p className="text-[11px] text-white/40">Reward active members with wallet currency for regular text chat messages.</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={passiveIncome}
                onChange={(e) => setPassiveIncome(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
            </label>
          </div>

          {passiveIncome && (
            <div className="pt-3 border-t border-white/[0.06] space-y-1 max-w-xs animate-in fade-in duration-150">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Reward Amount Per Message (1m Cooldown)</label>
              <input
                type="number"
                min={1}
                value={passiveAmount}
                onChange={(e) => setPassiveAmount(parseInt(e.target.value, 10) || 1)}
                className="glass-input font-mono text-xs"
              />
            </div>
          )}
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

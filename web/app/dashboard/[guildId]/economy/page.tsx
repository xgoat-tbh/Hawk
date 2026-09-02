'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SaveBar } from '@/components/SaveBar';
import { Coins, Flame, MessageSquareText, Radio } from 'lucide-react';

export default function EconomySettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);

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
    async function loadData() {
      try {
        const res = await fetch(`/api/guilds/${guildId}`);
        const data = await res.json();
        if (data.config?.economy) {
          const eco = data.config.economy;
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
      } catch (err) {
        console.error('Failed to load economy config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [guildId]);

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
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'economy',
          data: {
            currency_symbol: currencySymbol,
            start_balance: startBalance,
            daily_reward_amount: dailyRewardAmount,
            daily_streak_bonus: dailyStreakBonus,
            passive_income: passiveIncome,
            passive_amount: passiveAmount,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-surface rounded-xl w-48" />
        <div className="h-32 bg-surface rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <Coins className="w-6 h-6 text-[#5865F2]" />
          <span>Economy & Rewards</span>
        </h1>
        <p className="text-xs text-muted mt-1 font-medium">
          Customize currency symbols, daily streak multipliers, and passive chat earnings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Core Currency */}
        <div className="box-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 border-b-2 border-amber-500/40 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">Currency & Start Balance</h3>
              <p className="text-xs text-muted">Define your server’s custom currency icon and initial wallet amount.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Currency Symbol</label>
              <input
                type="text"
                value={currencySymbol}
                maxLength={5}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="box-input font-bold"
                placeholder="$"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Starting Balance</label>
              <input
                type="number"
                value={startBalance}
                min={0}
                onChange={(e) => setStartBalance(parseInt(e.target.value) || 0)}
                className="box-input font-bold"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Daily & Streak Multiplier */}
        <div className="box-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 border-b-2 border-red-500/40 flex items-center justify-center text-red-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">Daily Streak System</h3>
              <p className="text-xs text-muted">Configure base daily rewards and streak multipliers for continuous claims.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Base Daily Reward ({currencySymbol})</label>
              <input
                type="number"
                value={dailyRewardAmount}
                min={0}
                onChange={(e) => setDailyRewardAmount(parseInt(e.target.value) || 0)}
                className="box-input font-bold"
                placeholder="1000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Streak Bonus Per Day ({currencySymbol})</label>
              <input
                type="number"
                value={dailyStreakBonus}
                min={0}
                onChange={(e) => setDailyStreakBonus(parseInt(e.target.value) || 0)}
                className="box-input font-bold"
                placeholder="100"
              />
            </div>
          </div>
        </div>

        {/* Passive Chat Income */}
        <div className="box-card p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 border-b-2 border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Passive Chat Income</h3>
                <p className="text-xs text-muted">Members earn small currency amounts by chatting actively (60s cooldown).</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={passiveIncome}
                onChange={(e) => setPassiveIncome(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-[#14171f] border border-[#232733] peer-focus:outline-none rounded-lg peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865F2] peer-checked:border-[#5865F2]" />
            </label>
          </div>

          {passiveIncome && (
            <div className="max-w-xs pt-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Amount Per Message ({currencySymbol})</label>
              <input
                type="number"
                value={passiveAmount}
                min={1}
                onChange={(e) => setPassiveAmount(parseInt(e.target.value) || 1)}
                className="box-input font-bold mt-1"
                placeholder="10"
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

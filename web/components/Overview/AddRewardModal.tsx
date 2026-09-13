'use client';

import React, { useState } from 'react';
import { X, Gift, Coins } from 'lucide-react';
import { useGuildData } from '@/context/GuildContext';
import { useToast } from '@/components/ui/Toast';

interface AddRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddRewardModal({ isOpen, onClose, onSuccess }: AddRewardModalProps) {
  const { guildId } = useGuildData();
  const { success, error } = useToast();

  const [userName, setUserName] = useState('');
  const [amount, setAmount] = useState('500');
  const [rewardType, setRewardType] = useState<'currency' | 'role'>('currency');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/quick-actions/add-reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: userName.trim(),
          amount: parseInt(amount || '0', 10),
          rewardType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant reward');

      success(`Reward granted to ${userName}!`);
      setUserName('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to grant reward');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#121418] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#101217] dark:text-[#ededed]">Add Reward or Bonus</h3>
              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">Award coins or streak perks to a member</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#94a3b8] hover:text-[#101217] dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#334155] dark:text-[#c8ccd0] mb-1.5">
              Target Member (Username or @mention)
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="@member or username"
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#f8fafc] dark:bg-[#17191c] border border-black/[0.08] dark:border-white/[0.08] text-[#101217] dark:text-[#ededed] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] dark:text-[#c8ccd0] mb-1.5">
                Reward Type
              </label>
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#f8fafc] dark:bg-[#17191c] border border-black/[0.08] dark:border-white/[0.08] text-[#101217] dark:text-[#ededed] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="currency">Currency / Coins</option>
                <option value="role">Role Reward</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] dark:text-[#c8ccd0] mb-1.5">
                Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#f8fafc] dark:bg-[#17191c] border border-black/[0.08] dark:border-white/[0.08] text-[#101217] dark:text-[#ededed] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-[#64748b] dark:text-[#94a3b8] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !userName.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{submitting ? 'Granting...' : 'Grant Reward'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

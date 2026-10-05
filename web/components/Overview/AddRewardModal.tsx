 'use client';
import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { UserPicker } from '@/components/ui/UserPicker';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { useGuildData } from '@/context/GuildContext';
import { useToast } from '@/components/ui/Toast';
export function AddRewardModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) {
  const { guildId, config } = useGuildData(); const toast = useToast();
  const [userId, setUserId] = useState(''); const [amount, setAmount] = useState(500); const [pending, setPending] = useState(false);
  return <AnimatedModal isOpen={isOpen} onClose={() => { if (!pending) onClose(); }} title="Grant currency reward" subtitle="Add currency to a verified server member’s balance.">
    <form className="space-y-5" onSubmit={async event => {
      event.preventDefault(); if (pending) return; setPending(true);
      try { const response = await apiFetch(`/api/guilds/${guildId}/quick-actions/add-reward`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, amount }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success('Reward granted'); setUserId(''); onSuccess?.(); onClose(); }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Could not grant reward'); } finally { setPending(false); }
    }}><UserPicker label="Reward recipient" value={userId} onChange={setUserId}/><label className="block text-sm">Amount ({config?.economy?.currency_symbol || 'currency'})<input className="glass-input mt-2" type="number" min={1} max={1000000} step={1} required value={amount} onChange={e => setAmount(Number(e.target.value))}/></label>
      <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={pending} onClick={onClose}>Cancel</button><button className="btn-primary" disabled={pending || !userId || !Number.isInteger(amount) || amount <= 0}>{pending ? 'Granting…' : 'Grant reward'}</button></div>
    </form>
  </AnimatedModal>;
}

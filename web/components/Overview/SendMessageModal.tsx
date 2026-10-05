 'use client';
import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { useGuildData } from '@/context/GuildContext';
import { useToast } from '@/components/ui/Toast';
export function SendMessageModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) {
  const { guildId, channels } = useGuildData(); const toast = useToast();
  const [channelId, setChannelId] = useState(''); const [content, setContent] = useState(''); const [sending, setSending] = useState(false);
  return <AnimatedModal isOpen={isOpen} onClose={() => { if (!sending) onClose(); }} title="Send message as Hawk" subtitle="Post to a channel in this server. Mentions are suppressed.">
    <form className="space-y-5" onSubmit={async event => {
      event.preventDefault(); if (sending) return; setSending(true);
      try { const response = await apiFetch(`/api/guilds/${guildId}/quick-actions/send-message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channelId, content }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success('Message posted'); setContent(''); onSuccess?.(); onClose(); }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send message'); } finally { setSending(false); }
    }}><ChannelPicker label="Destination channel" channels={channels.filter(c => c.type === 0 || c.type === 5)} value={channelId} onChange={v => setChannelId(v || '')}/>
      <label className="block text-sm">Message content<textarea className="glass-input mt-2" rows={5} maxLength={2000} value={content} onChange={e => setContent(e.target.value)} required/></label>
      <div className="flex justify-end gap-3"><button type="button" disabled={sending} className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={sending || !channelId || !content.trim()}>{sending ? 'Sending…' : 'Send message'}</button></div>
    </form>
  </AnimatedModal>;
}

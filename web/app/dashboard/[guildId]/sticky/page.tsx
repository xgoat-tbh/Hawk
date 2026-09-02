'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { useGuildData } from '@/context/GuildContext';
import { Pin, Plus, Trash2, Hash, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function StickyMessagesPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, refreshData } = useGuildData();

  const stickyMessages = config?.stickyMessages || [];

  const [newChannelId, setNewChannelId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAddSticky = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelId || !newMessage.trim()) {
      setActionError('Please select a target channel and enter a sticky message.');
      return;
    }

    setIsAdding(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'sticky_set',
          data: {
            channel_id: newChannelId,
            message: newMessage.trim(),
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to create sticky message');

      setNewChannelId(null);
      setNewMessage('');
      setActionSuccess('Persistent sticky notice configured.');
      await refreshData();
    } catch (err: any) {
      setActionError(err.message || 'Error creating sticky message');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSticky = async (channelId: string) => {
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'sticky_delete',
          data: { channel_id: channelId },
        }),
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to delete sticky message:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Pin className="w-4 h-4 text-white/80" />
            <span>Persistent Sticky Messages</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Keep important guidelines, rule reminders, or announcements continuously visible at the bottom of active channels.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Create Sticky (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Set Channel Sticky Notice</h3>
              <p className="text-[11px] text-white/40">The bot reposts this message automatically when chat moves.</p>
            </div>
          </div>

          <form onSubmit={handleAddSticky} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Target Channel</label>
              <ChannelSelect
                channels={channels}
                value={newChannelId}
                onChange={setNewChannelId}
                placeholder="Select text channel..."
                allowedTypes={[0, 5]}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Notice Text</label>
                <span className="text-[10px] font-mono text-white/30">{newMessage.length}/2000</span>
              </div>
              <textarea
                rows={3}
                required
                maxLength={2000}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="⚠️ Remember to stay respectful and follow server rules in this channel."
                className="glass-input text-xs resize-y leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Save Sticky Notice</span>
            </button>
          </form>
        </div>

        {/* Right: Active Sticky Notices (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Active Sticky Messages ({stickyMessages.length})
            </span>
          </div>

          {stickyMessages.length === 0 ? (
            <div className="glass-card p-10 text-center text-xs text-white/30">
              No sticky messages configured yet. Choose a channel and enter a message on the left.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stickyMessages.map((item: any) => {
                const targetChannel = channels.find((c) => c.id === item.channel_id);
                return (
                  <div
                    key={item.channel_id}
                    className="glass-card p-4 flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-white/50 shrink-0" />
                        <span className="font-medium text-xs text-white truncate">
                          #{targetChannel?.name || `Channel ${item.channel_id}`}
                        </span>
                      </div>
                      <p className="text-xs text-white/70 bg-[#1e1f22]/50 p-2.5 rounded-lg border border-white/[0.04] whitespace-pre-wrap leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSticky(item.channel_id)}
                      className="btn-outline-danger p-2 shrink-0 self-start"
                      title="Delete sticky notice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
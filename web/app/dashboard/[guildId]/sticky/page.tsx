'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SectionHeader } from '@/components/ui/SectionHeader';
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
      setActionSuccess('Channel sticky notice configured.');
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
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Create Sticky Form Bar */}
      <form
        onSubmit={handleAddSticky}
        className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[10px] font-mono uppercase text-white/40">Target Channel</label>
            <ChannelSelect
              channels={channels}
              value={newChannelId}
              onChange={setNewChannelId}
              placeholder="Select text channel..."
              allowedTypes={[0, 5]}
            />
          </div>

          <div className="sm:col-span-8 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase text-white/40">Notice Text</label>
              <span className="text-[10px] font-mono text-white/30">{newMessage.length}/2000</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                maxLength={2000}
                placeholder="⚠️ Remember to stay respectful and follow server guidelines."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="glass-input font-sans text-xs flex-1"
              />
              <button
                type="submit"
                disabled={isAdding}
                className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Set Sticky</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Sticky Notices Data Table (with Independent Internal Scroll) */}
      <div className="space-y-2">
        <SectionHeader
          title={`Active Sticky Notices (${stickyMessages.length})`}
          description="The bot automatically repositions these notices as chat messages arrive."
        />

        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#08080a]">
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#0d0d10] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Persistent Notice Content</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stickyMessages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-white/30 text-xs">
                      No sticky messages configured. Choose a channel and enter a message above.
                    </td>
                  </tr>
                ) : (
                  stickyMessages.map((item: any) => {
                    const targetChannel = channels.find((c) => c.id === item.channel_id);
                    return (
                      <tr key={item.channel_id} className="hover:bg-white/[0.015] transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs text-white font-medium">
                            <Hash className="w-3.5 h-3.5 text-white/40" />
                            <span>#{targetChannel?.name || `Channel ${item.channel_id}`}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-xs text-white/80 max-w-md">
                          <p className="line-clamp-2 leading-relaxed">{item.message}</p>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSticky(item.channel_id)}
                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors"
                            title="Delete notice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
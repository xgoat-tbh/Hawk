'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { Pin, Plus, Trash2, Hash, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function StickyMessagesPage() {
  const { guildId } = useParams() as { guildId: string };
  const containerRef = usePageEntrance();
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
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <Pin className="w-4 h-4 text-[#a9adb2]" />
            <span>Persistent Sticky Messages</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
            Keep important guidelines, rule reminders, or announcements continuously visible at the bottom of active channels.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-md bg-success-soft border border-success-border flex items-center gap-2 text-xs text-success-text">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-md bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 text-critical shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Create Sticky Form Bar */}
      <form
        onSubmit={handleAddSticky}
        className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[10px] font-mono uppercase text-[#7e8389]">Target Channel</label>
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
              <label className="text-[10px] font-mono uppercase text-[#7e8389]">Notice Text</label>
              <span className="text-[10px] font-mono text-[#7e8389]">{newMessage.length}/2000</span>
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

      {/* Sticky Notices Data Table with HawkScrollArea */}
      <div className="space-y-2" data-animate-section>
        <SectionHeader
          title={`Active Sticky Notices (${stickyMessages.length})`}
          description="The bot automatically repositions these notices as chat messages arrive."
        />

        <div className="border border-[#24272b] rounded-md overflow-hidden bg-[#0d0e10]">
          <HawkScrollArea maxHeight="50vh">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#1c1f23] text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
                <tr>
                  <th className="py-2.5 px-4">Channel</th>
                  <th className="py-2.5 px-4">Persistent Notice Content</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1f23]">
                {stickyMessages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#7e8389] text-xs">
                      No sticky messages configured. Choose a channel and enter a message above.
                    </td>
                  </tr>
                ) : (
                  stickyMessages.map((item: any) => {
                    const targetChannel = channels.find((c) => c.id === item.channel_id);
                    return (
                      <tr key={item.channel_id} className="hover:bg-[#121417]/50 transition-colors">
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#f1f2f3] font-medium">
                            <Hash className="w-3.5 h-3.5 text-[#7e8389]" />
                            <span>#{targetChannel?.name || `Channel ${item.channel_id}`}</span>
                          </span>
                        </td>

                        <td className="py-2.5 px-4 text-xs text-[#d5d7da] max-w-md">
                          <p className="line-clamp-2 leading-relaxed">{item.message}</p>
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSticky(item.channel_id)}
                            className="p-1.5 rounded-md text-[#7e8389] hover:text-critical-text hover:bg-critical-soft transition-colors"
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
          </HawkScrollArea>
        </div>
      </div>
    </div>
  );
}
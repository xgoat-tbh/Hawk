'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SyncLoader } from '@/components/SyncLoader';
import { Pin, Plus, Trash2, Hash, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StickyMessagesPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [stickies, setStickies] = useState<any[]>([]);

  const [newChannelId, setNewChannelId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch(`/api/guilds/${guildId}`);
      const data = await res.json();
      setChannels(data.channels || []);
      setStickies(data.config?.stickyMessages || []);
    } catch (err) {
      console.error('Failed to load sticky messages:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleAddSticky = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelId || !newContent.trim()) {
      setActionError('Please select a target channel and enter your sticky message.');
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
          module: 'sticky_add',
          data: {
            channel_id: newChannelId,
            content: newContent.trim(),
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to set sticky message');

      setNewChannelId(null);
      setNewContent('');
      setActionSuccess('Sticky message posted & pinned to channel.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error setting sticky message');
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
      await loadData();
    } catch (err) {
      console.error('Failed to delete sticky message:', err);
    }
  };

  if (loading) {
    return <SyncLoader title="Syncing Sticky Messages" subtitle="Fetching channel-pinned dynamic notice boards and rule announcements..." />;
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <Pin className="w-6 h-6 text-[#5865F2]" />
          <span>Persistent Sticky Messages</span>
        </h1>
        <p className="text-xs text-white/50 mt-1 font-medium">
          Automatically keep essential instructions, rules, or links at the very bottom of active text channels.
        </p>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Add Form */}
        <form onSubmit={handleAddSticky} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Pin New Sticky Message</h3>
                <p className="text-xs text-white/40">Select a channel and provide the message markdown.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="btn-outline-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Pinning...' : 'Pin Sticky'}</span>
            </button>
          </div>

          <div className="space-y-4 pt-2">
            <div className="max-w-md space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Target Text Channel</label>
              <ChannelSelect
                channels={channels}
                value={newChannelId}
                onChange={setNewChannelId}
                placeholder="Select text channel..."
                allowedTypes={[0, 5]}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Sticky Message Content</label>
              <textarea
                rows={4}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="**Reminder:** Make sure to follow the server rules in this channel!"
                className="glass-input text-xs leading-relaxed"
              />
            </div>
          </div>
        </form>

        {/* Existing Stickies */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                Active Sticky Messages ({stickies.length})
              </h3>
              <p className="text-xs text-white/40">These messages are re-posted automatically whenever new chat messages arrive.</p>
            </div>
          </div>

          {stickies.length === 0 ? (
            <div className="text-center py-12 text-xs text-white/30">
              No sticky messages active. Use the form above or Discord <code className="text-[#5865F2] font-mono">!sticky</code>.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {stickies.map((sticky) => {
                const targetChannel = channels.find((c) => c.id === sticky.channel_id);
                return (
                  <div key={sticky.channel_id} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/25 text-[#7289da] font-semibold text-xs flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5" />
                          <span>{targetChannel ? targetChannel.name : sticky.channel_id}</span>
                        </span>
                      </div>
                      <div className="bg-[#040406] border border-white/[0.08] rounded-xl p-3 text-xs text-white/80 font-mono whitespace-pre-wrap max-w-2xl">
                        {sticky.content}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSticky(sticky.channel_id)}
                      className="btn-outline-danger self-start"
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
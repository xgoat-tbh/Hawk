'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { EmojiPicker } from '@/components/EmojiPicker';
import { SyncLoader } from '@/components/SyncLoader';
import { Pin, Plus, Trash2, Hash, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function StickyMessagesPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [emojis, setEmojis] = useState<any[]>([]);
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
      setEmojis(data.emojis || []);
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

  const insertEmoji = (emojiCode: string) => {
    setNewContent((prev) => `${prev} ${emojiCode}`);
  };

  if (loading) {
    return <SyncLoader title="Loading Sticky Messages" subtitle="Fetching channel-pinned dynamic notice boards and rule announcements..." />;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Pin className="w-4 h-4 text-white/80" />
            <span>Sticky Channel Messages</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Auto-reposted reminder notices and rule reminders that stick to the bottom of active text channels.
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
        {/* Left: Add Sticky (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Create Sticky Notice</h3>
              <p className="text-[11px] text-white/40">Select channel and enter sticky message text.</p>
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
                <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Notice Content</label>
                {emojis.length > 0 && (
                  <EmojiPicker emojis={emojis} onSelectEmoji={insertEmoji} />
                )}
              </div>
              <textarea
                rows={4}
                required
                maxLength={4000}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="**Reminder**: Please keep discussions civil and follow discord rules."
                className="glass-input font-sans text-xs leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pin className="w-3.5 h-3.5" />}
              <span>Post Sticky Notice</span>
            </button>
          </form>
        </div>

        {/* Right: Existing Sticky Messages (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Active Sticky Channels ({stickies.length})
            </span>
          </div>

          {stickies.length === 0 ? (
            <div className="glass-card p-10 text-center text-xs text-white/30">
              No sticky messages configured yet. Choose a channel and submit a notice on the left.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stickies.map((sticky) => {
                const targetChannel = channels.find((c) => c.id === sticky.channel_id);
                return (
                  <div
                    key={sticky.channel_id}
                    className="glass-card p-4 flex items-start justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-white/50 shrink-0" />
                        <span className="font-medium text-xs text-white truncate">
                          #{targetChannel?.name || `Channel ${sticky.channel_id}`}
                        </span>
                      </div>

                      <p className="text-[11px] text-white/60 whitespace-pre-wrap leading-relaxed">
                        {sticky.content}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSticky(sticky.channel_id)}
                      className="btn-outline-danger p-2 shrink-0"
                      title="Delete sticky message"
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
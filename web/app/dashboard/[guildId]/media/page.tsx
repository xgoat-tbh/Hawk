'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { useGuildData } from '@/context/GuildContext';
import { Image as ImageIcon, Plus, Trash2, Hash, MessageSquare, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function MediaChannelsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, refreshData, updateConfigLocally } = useGuildData();

  const mediaChannels = config?.mediaChannels || [];
  const autoThread = config?.mediaAutoThread ?? true;

  const [newChannelId, setNewChannelId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAddMediaChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelId) {
      setActionError('Please select a target channel.');
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
          module: 'media_add',
          data: { channel_id: newChannelId },
        }),
      });

      if (!res.ok) throw new Error('Failed to add media channel');

      setNewChannelId(null);
      setActionSuccess('Channel designated as media-only.');
      await refreshData();
    } catch (err: any) {
      setActionError(err.message || 'Error configuring media channel');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMediaChannel = async (channelId: string) => {
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'media_delete',
          data: { channel_id: channelId },
        }),
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to remove media channel:', err);
    }
  };

  const handleToggleAutoThread = async (val: boolean) => {
    updateConfigLocally('mediaAutoThread', val);
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'media_set_autothread',
          data: { auto_thread: val },
        }),
      });
      setActionSuccess('Auto-thread setting saved.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update auto-thread:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-white/80" />
            <span>Media-Only Channels</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Designate gallery channels that automatically enforce image/video attachments and create discussion threads.
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

      {/* Auto Thread Global Toggle */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-xs text-white uppercase tracking-wider">Auto-Create Discussion Threads</h3>
            <p className="text-[11px] text-white/40">Automatically spawn a discussion thread under each media post.</p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoThread}
            onChange={(e) => handleToggleAutoThread(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Designate Channel Form (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Designate Media Channel</h3>
              <p className="text-[11px] text-white/40">Non-attachment text messages will be auto-deleted.</p>
            </div>
          </div>

          <form onSubmit={handleAddMediaChannel} className="space-y-3 pt-1">
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

            <button
              type="submit"
              disabled={isAdding}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Designate Channel</span>
            </button>
          </form>
        </div>

        {/* Right: Active Media Channels (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Designated Media Channels ({mediaChannels.length})
            </span>
          </div>

          {mediaChannels.length === 0 ? (
            <div className="glass-card p-10 text-center text-xs text-white/30">
              No media-only channels designated. Select a channel on the left to enforce media posts.
            </div>
          ) : (
            <div className="space-y-2.5">
              {mediaChannels.map((item: any) => {
                const targetChannel = channels.find((c) => c.id === item.channel_id);
                return (
                  <div
                    key={item.channel_id}
                    className="glass-card p-4 flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-white/50 shrink-0" />
                        <span className="font-medium text-xs text-white truncate">
                          #{targetChannel?.name || `Channel ${item.channel_id}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40">
                        Attachment required. Text-only messages will be filtered.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMediaChannel(item.channel_id)}
                      className="btn-outline-danger p-2 shrink-0"
                      title="Remove media filter"
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
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SyncLoader } from '@/components/SyncLoader';
import { Image as ImageIcon, Plus, Trash2, Hash, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MediaChannelsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [mediaChannels, setMediaChannels] = useState<any[]>([]);
  const [autoThread, setAutoThread] = useState(true);

  const [newChannelId, setNewChannelId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch(`/api/guilds/${guildId}`);
      const data = await res.json();
      setChannels(data.channels || []);
      setMediaChannels(data.config?.mediaChannels || []);
      setAutoThread(data.config?.mediaAutoThread ?? true);
    } catch (err) {
      console.error('Failed to load media channels:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [guildId]);

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
      await loadData();
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
      await loadData();
    } catch (err) {
      console.error('Failed to remove media channel:', err);
    }
  };

  const handleToggleAutoThread = async (val: boolean) => {
    setAutoThread(val);
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'media_set_autothread',
          data: { auto_thread: val },
        }),
      });
      setActionSuccess('Auto-thread configuration updated.');
    } catch (err) {
      console.error('Failed to update auto-thread:', err);
    }
  };

  if (loading) {
    return <SyncLoader title="Syncing Media Channels" subtitle="Fetching automated artwork, attachment validation, and gallery feeds..." />;
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <ImageIcon className="w-6 h-6 text-[#5865F2]" />
          <span>Media-Only Channels</span>
        </h1>
        <p className="text-xs text-white/50 mt-1 font-medium">
          Channels where non-media text messages are automatically cleaned to maintain clean photo, video, and art galleries.
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
        {/* Auto Thread Toggle */}
        <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">Automatic Discussion Threads</h3>
              <p className="text-xs text-white/40">Spawn an auto-discussion thread under every new image or video upload.</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoThread}
              onChange={(e) => handleToggleAutoThread(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865F2]"></div>
          </label>
        </div>

        {/* Add Form */}
        <form onSubmit={handleAddMediaChannel} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Designate Media Channel</h3>
                <p className="text-xs text-white/40">Select a text channel to enforce image/video-only uploads.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="btn-outline-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Adding...' : 'Add Channel'}</span>
            </button>
          </div>

          <div className="max-w-md space-y-2 pt-2">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Target Channel</label>
            <ChannelSelect
              channels={channels}
              value={newChannelId}
              onChange={setNewChannelId}
              placeholder="Select text channel..."
              allowedTypes={[0, 5]}
            />
          </div>
        </form>

        {/* Existing Media Channels */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                Configured Media Channels ({mediaChannels.length})
              </h3>
              <p className="text-xs text-white/40">Only attachments and media links are allowed in these channels.</p>
            </div>
          </div>

          {mediaChannels.length === 0 ? (
            <div className="text-center py-12 text-xs text-white/30">
              No media channels configured. Use the form above or Discord <code className="text-[#5865F2] font-mono">!media</code>.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {mediaChannels.map((item) => {
                const targetChannel = channels.find((c) => c.id === item.channel_id);
                return (
                  <div key={item.channel_id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/25 text-[#7289da] font-semibold text-xs flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" />
                        <span>{targetChannel ? targetChannel.name : item.channel_id}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMediaChannel(item.channel_id)}
                      className="btn-outline-danger"
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
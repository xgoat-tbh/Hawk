'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { StatCard } from '@/components/ui/StatCard';
import { useGuildData } from '@/context/GuildContext';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Hash,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function MediaChannelsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, refreshData, updateConfigLocally } = useGuildData();

  const [activeTab, setActiveTab] = useState<'channels' | 'add' | 'settings'>('channels');
  const mediaChannels: string[] = config?.mediaChannels || [];
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
      setActiveTab('channels');
      setTimeout(() => setActionSuccess(null), 4000);
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
      setActionSuccess('Media filter removed from channel.');
      setTimeout(() => setActionSuccess(null), 4000);
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
      setActionSuccess('Auto-thread preference saved.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update auto-thread:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0f2f5] flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            Media-Only Channels & Auto-Threading
          </h1>
          <p className="mt-1 text-xs text-[#8c949e]">
            Designate gallery channels that enforce media attachments and automatically spawn discussion threads.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('add')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Gallery Channel
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Channels"
          value={mediaChannels.length}
          subtitle="Enforced media galleries"
          icon={ImageIcon}
        />
        <StatCard
          title="Auto-Threading"
          value={autoThread ? 'Active' : 'Disabled'}
          subtitle="Automatic discussion spawn"
          icon={MessageSquare}
        />
        <StatCard
          title="Attachment Filter"
          value="Enforced"
          subtitle="Non-attachment posts purged"
          icon={ShieldCheck}
        />
        <StatCard
          title="Bot Pipeline"
          value="Real-time"
          subtitle="Zero latency discord gateway"
          icon={Zap}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('channels')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'channels'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Designated Channels ({mediaChannels.length})
        </button>

        <button
          onClick={() => setActiveTab('add')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'add'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Plus className="w-4 h-4" />
          Add Channel
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Thread Settings
        </button>
      </div>

      {/* TAB 1: Channels List */}
      {activeTab === 'channels' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="Designated Media Galleries"
            description="Channels where users must include image, video, or audio attachments. Pure text messages are immediately purged."
          />

          {mediaChannels.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#717882]">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-white">No media channels configured</p>
              <p className="mt-1">Add a channel above to restrict it to media attachments only.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1d24] border border-[#1a1d24] rounded-lg overflow-hidden bg-[#121418]">
              {mediaChannels.map((cId) => {
                const ch = channels.find((c) => c.id === cId);
                return (
                  <div key={cId} className="flex items-center justify-between p-4 hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Hash className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          #{ch?.name || 'unknown-channel'}
                        </div>
                        <div className="text-[10px] font-mono text-[#717882]">{cId}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteMediaChannel(cId)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
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
      )}

      {/* TAB 2: Add Channel */}
      {activeTab === 'add' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="Designate New Media Channel"
            description="Select a text or announcement channel to convert into an attachment-only gallery."
          />

          <form onSubmit={handleAddMediaChannel} className="space-y-4">
            <SettingRow
              label="Target Channel"
              description="Users who post plain text without an image or video in this channel will have their message deleted."
            >
              <div className="w-72">
                <ChannelPicker
                  channels={channels}
                  value={newChannelId}
                  onChange={setNewChannelId}
                  placeholder="Select channel to restrict..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>

            <div className="pt-3 border-t border-[#1a1d24] flex justify-end">
              <button
                type="submit"
                disabled={isAdding || !newChannelId}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors disabled:opacity-40"
              >
                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isAdding ? 'Adding...' : 'Confirm Designation'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Settings */}
      {activeTab === 'settings' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="Discussion Thread Automation"
            description="Control whether Hawk creates a public thread under valid media uploads to keep the main channel clean."
          />

          <SettingRow
            label="Auto-Create Discussion Threads"
            description="Automatically spawns a dedicated comment thread under every image or video upload."
            badge={autoThread ? 'Active' : 'Disabled'}
            badgeVariant={autoThread ? 'success' : 'neutral'}
          >
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoThread}
                onChange={(e) => handleToggleAutoThread(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#121417] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#ededed] after:border-[#1f2226] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 border border-[#1f2226]"></div>
            </label>
          </SettingRow>
        </div>
      )}
    </div>
  );
}
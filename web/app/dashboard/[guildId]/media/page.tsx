'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { Image as ImageIcon, Plus, Trash2, Hash, MessageSquare, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function MediaChannelsPage() {
  const { guildId } = useParams() as { guildId: string };
  const containerRef = usePageEntrance();
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
      setActionSuccess('Auto-thread preference saved.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to update auto-thread:', err);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#a9adb2]" />
            <span>Media-Only Channels</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
            Designate gallery channels that require attachments and automatically spawn comment discussion threads.
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

      {/* Auto Thread Setting Row */}
      <div className="space-y-1" data-animate-section>
        <SectionHeader
          title="Thread Automation"
          description="Spawns discussion threads under image and video uploads."
          icon={<MessageSquare className="w-4 h-4" />}
        />

        <div className="pt-2">
          <SettingRow
            label="Auto-Create Discussion Threads"
            description="Automatically creates a public discussion thread under every valid media post."
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
              <div className="w-10 h-5 bg-[#17191c] border border-[#24272b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#f1f2f3] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success peer-checked:after:bg-black"></div>
            </label>
          </SettingRow>
        </div>
      </div>

      {/* Designate Channel Form Bar */}
      <form
        onSubmit={handleAddMediaChannel}
        className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="flex-1">
          <ChannelSelect
            channels={channels}
            value={newChannelId}
            onChange={setNewChannelId}
            placeholder="Select text channel to designate as media gallery..."
            allowedTypes={[0, 5]}
          />
        </div>

        <button
          type="submit"
          disabled={!newChannelId || isAdding}
          className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-1.5 shrink-0"
        >
          {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          <span>Designate Gallery</span>
        </button>
      </form>

      {/* Media Channels Data Table with HawkScrollArea */}
      <div className="space-y-2" data-animate-section>
        <SectionHeader
          title={`Designated Media Channels (${mediaChannels.length})`}
          description="Messages lacking image or video attachments in these channels will be filtered."
        />

        <div className="border border-[#24272b] rounded-md overflow-hidden bg-[#0d0e10]">
          <HawkScrollArea maxHeight="50vh">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#1c1f23] text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
                <tr>
                  <th className="py-2.5 px-4">Channel</th>
                  <th className="py-2.5 px-4">Enforcement Rule</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1f23]">
                {mediaChannels.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#7e8389] text-xs">
                      No media-only channels designated. Select a channel above to enforce media attachments.
                    </td>
                  </tr>
                ) : (
                  mediaChannels.map((item: any) => {
                    const targetChannel = channels.find((c) => c.id === item.channel_id);
                    return (
                      <tr key={item.channel_id} className="hover:bg-[#121417]/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#f1f2f3] font-medium">
                            <Hash className="w-3.5 h-3.5 text-[#7e8389]" />
                            <span>#{targetChannel?.name || `Channel ${item.channel_id}`}</span>
                          </span>
                        </td>

                        <td className="py-2.5 px-4 text-xs text-[#a9adb2]">
                          Attachment Required (Images/Videos only)
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMediaChannel(item.channel_id)}
                            className="p-1.5 rounded-md text-[#7e8389] hover:text-critical-text hover:bg-critical-soft transition-colors"
                            title="Remove media filter"
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
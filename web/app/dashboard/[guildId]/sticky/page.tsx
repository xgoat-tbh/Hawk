'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import {
  Pin,
  Plus,
  Trash2,
  Edit2,
  Hash,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function StickyMessagesPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, refreshData, loading } = useGuildData();
  const containerRef = usePageEntrance(!loading);

  const stickyMessages = config?.stickyMessages || [];

  // Create Form State
  const [newChannelId, setNewChannelId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit Form State
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Feedback State
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const startEditing = (channelId: string, currentContent: string) => {
    setEditingChannelId(channelId);
    setEditContent(currentContent);
    setActionError(null);
    setActionSuccess(null);
  };

  const cancelEditing = () => {
    setEditingChannelId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (channelId: string) => {
    if (!editContent.trim()) {
      setActionError('Notice content cannot be empty.');
      return;
    }

    setIsSavingEdit(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'sticky_update',
          data: {
            channel_id: channelId,
            content: editContent.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update sticky notice.');

      const targetChannel = channels.find((c) => c.id === channelId);
      setActionSuccess(`Sticky notice for #${targetChannel?.name || 'channel'} updated and pushed to server.`);
      setEditingChannelId(null);
      setEditContent('');
      await refreshData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Error updating sticky notice.');
    } finally {
      setIsSavingEdit(false);
    }
  };

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
          module: 'sticky_add',
          data: {
            channel_id: newChannelId,
            content: newMessage.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create sticky message.');

      const targetChannel = channels.find((c) => c.id === newChannelId);
      setNewChannelId(null);
      setNewMessage('');
      setActionSuccess(`Sticky notice for #${targetChannel?.name || 'channel'} created and pushed to server.`);
      await refreshData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Error creating sticky message.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSticky = async (channelId: string) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'sticky_delete',
          data: { channel_id: channelId },
        }),
      });

      if (!res.ok) throw new Error('Failed to delete notice');

      const targetChannel = channels.find((c) => c.id === channelId);
      setActionSuccess(`Sticky notice for #${targetChannel?.name || 'channel'} removed from server.`);
      if (editingChannelId === channelId) cancelEditing();
      await refreshData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete sticky message.');
    }
  };

  const insertVariable = (tag: string) => {
    if (editingChannelId) {
      setEditContent((prev) => `${prev} ${tag}`);
    } else {
      setNewMessage((prev) => `${prev} ${tag}`);
    }
  };

  const variables = ['{user}', '{server}', '{rules}', '⚠️', '📌', '✨'];

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17191c] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#ededed] tracking-tight flex items-center gap-2">
            <Pin className="w-4 h-4 text-[#949aa2]" />
            <span>Persistent Sticky Messages</span>
          </h1>
          <p className="text-xs text-[#6e747c] mt-0.5">
            Keep important guidelines, rule reminders, or announcements continuously visible at the bottom of active channels.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-success-soft border border-success-border flex items-center gap-2 text-xs text-success-text">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-lg bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 text-critical shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Create New Sticky Form Bar */}
      <form
        onSubmit={handleAddSticky}
        className="p-4 sm:p-5 rounded-lg bg-[#0d0e10] border border-[#1f2226] space-y-4 shadow-sm"
        data-animate-section
      >
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#ededed] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#6e747c]" />
            <span>Add New Sticky Notice</span>
          </h4>
          <div className="flex items-center gap-1.5">
            {variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(v)}
                className="px-2 py-0.5 rounded bg-[#121417] hover:bg-[#17191c] border border-[#1f2226] text-[10px] font-mono text-[#949aa2] hover:text-[#ededed] transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4 space-y-1">
            <label className="text-[10px] font-mono uppercase text-[#6e747c]">Target Channel</label>
            <ChannelPicker
              channels={channels}
              value={newChannelId}
              onChange={setNewChannelId}
              placeholder="Select text channel..."
              allowedTypes={[0, 5]}
            />
          </div>

          <div className="sm:col-span-8 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase text-[#6e747c]">Notice Text</label>
              <span className="text-[10px] font-mono text-[#6e747c]">{newMessage.length}/4000</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                maxLength={4000}
                placeholder="⚠️ Remember to stay respectful and follow server guidelines."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="glass-input text-xs flex-1"
              />
              <button
                type="submit"
                disabled={isAdding}
                className="btn-primary py-1.5 px-3.5 text-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Set Sticky</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Active Sticky Notices Section */}
      <div className="space-y-3" data-animate-section>
        <SectionHeader
          title={`Active Sticky Notices (${stickyMessages.length})`}
          description="The bot automatically repositions these notices as chat messages arrive."
        />

        <div className="border border-[#1f2226] rounded-lg overflow-hidden bg-[#0d0e10] shadow-sm">
          <HawkScrollArea maxHeight="55vh">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#17191c] text-[10px] font-mono uppercase tracking-wider text-[#6e747c]">
                <tr>
                  <th className="py-2.5 px-4 w-48">Channel</th>
                  <th className="py-2.5 px-4">Persistent Notice Content</th>
                  <th className="py-2.5 px-4 text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17191c]">
                {stickyMessages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-[#6e747c] text-xs">
                      No sticky messages configured. Choose a channel and enter a message above.
                    </td>
                  </tr>
                ) : (
                  stickyMessages.map((item: any) => {
                    const targetChannel = channels.find((c) => c.id === item.channel_id);
                    const noticeText = item.content || item.message || '';
                    const isEditing = editingChannelId === item.channel_id;

                    return (
                      <React.Fragment key={item.channel_id}>
                        <tr
                          className={`hover:bg-[#121417]/50 transition-colors ${
                            isEditing ? 'bg-[#121417]' : ''
                          }`}
                        >
                          <td className="py-3 px-4 whitespace-nowrap align-top">
                            <span className="inline-flex items-center gap-1.5 text-xs text-[#ededed] font-medium">
                              <Hash className="w-3.5 h-3.5 text-[#6e747c]" />
                              <span>#{targetChannel?.name || `Channel ${item.channel_id}`}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-xs text-[#ededed] leading-relaxed break-words whitespace-pre-wrap">
                              {noticeText}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditing
                                    ? cancelEditing()
                                    : startEditing(item.channel_id, noticeText)
                                }
                                className="p-1 rounded text-[#6e747c] hover:text-[#ededed] hover:bg-white/5 transition-colors"
                                title="Edit Notice"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSticky(item.channel_id)}
                                className="p-1 rounded text-[#6e747c] hover:text-critical-text hover:bg-critical-soft transition-colors"
                                title="Delete Notice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isEditing && (
                          <tr className="bg-[#121417]">
                            <td colSpan={3} className="px-4 py-3 border-t border-[#17191c]">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono uppercase text-[#6e747c]">
                                    Editing notice for #{targetChannel?.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-[#6e747c]">
                                    {editContent.length}/4000
                                  </span>
                                </div>
                                <textarea
                                  rows={3}
                                  maxLength={4000}
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="glass-input text-xs w-full resize-y"
                                />
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={cancelEditing}
                                    className="btn-outline-secondary text-xs py-1 px-2.5"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(item.channel_id)}
                                    disabled={isSavingEdit}
                                    className="btn-primary text-xs py-1 px-3 flex items-center gap-1.5"
                                  >
                                    {isSavingEdit ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : null}
                                    <span>Save & Push</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
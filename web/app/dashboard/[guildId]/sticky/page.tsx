'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { StatCard } from '@/components/ui/StatCard';
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
  ShieldCheck,
  Zap,
  Save,
  X,
} from 'lucide-react';

export default function StickyMessagesPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, refreshData } = useGuildData();

  const stickyMessages = config?.stickyMessages || [];

  const [activeTab, setActiveTab] = useState<'notices' | 'create' | 'variables'>('notices');

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
      setActionSuccess(`Sticky notice for #${targetChannel?.name || 'channel'} updated.`);
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
      setActionError('Please select a target channel and enter a notice text.');
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
      setActionSuccess(`Sticky notice for #${targetChannel?.name || 'channel'} active.`);
      await refreshData();
      setActiveTab('notices');
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
      setActionSuccess(`Sticky notice for #${targetChannel?.name || 'channel'} removed.`);
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
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#101217] dark:text-[#f0f2f5] flex items-center gap-2.5">
            <Pin className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Persistent Sticky Notices
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8c949e]">
            Keep important guidelines, rule reminders, or announcements continuously visible at the bottom of active channels.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('create')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Sticky Notice
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Stickies"
          value={stickyMessages.length}
          subtitle="Channels with notices"
          icon={Pin}
        />
        <StatCard
          title="Resurfacing"
          value="Real-time"
          subtitle="Repositioned on new chat"
          icon={Sparkles}
        />
        <StatCard
          title="Capacity Limit"
          value="1 / Channel"
          subtitle="Prevents room flooding"
          icon={ShieldCheck}
        />
        <StatCard
          title="Bot Engine"
          value="Synchronized"
          subtitle="Across all Discord shards"
          icon={Zap}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08] dark:border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('notices')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'notices'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Pin className="w-4 h-4" />
          Active Notices ({stickyMessages.length})
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'create'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Plus className="w-4 h-4" />
          Create Notice
        </button>

        <button
          onClick={() => setActiveTab('variables')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'variables'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Formatting & Variables
        </button>
      </div>

      {/* TAB 1: Notices List */}
      {activeTab === 'notices' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Managed Channel Stickies"
            description="The bot automatically repositions these notices as regular chat messages arrive, deleting the previous iteration."
          />

          {stickyMessages.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-[#717882]">
              <Pin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-[#101217] dark:text-white">No sticky notices configured</p>
              <p className="mt-1">Create a notice above to keep announcements permanently visible in a channel.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-[#1a1d24] border border-black/[0.08] dark:border-[#1a1d24] rounded-lg overflow-hidden bg-slate-50/50 dark:bg-[#121418]">
              {stickyMessages.map((item: any) => {
                const targetChannel = channels.find((c) => c.id === item.channel_id);
                const noticeText = item.content || item.message || '';
                const isEditing = editingChannelId === item.channel_id;

                return (
                  <div key={item.channel_id} className="p-4 hover:bg-slate-100/50 dark:hover:bg-[#16181d]/50 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-[#101217] dark:text-white">
                          #{targetChannel?.name || 'unknown-channel'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-[#717882]">{item.channel_id}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(item.channel_id)}
                              disabled={isSavingEdit}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 transition-colors"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1.5 rounded-md bg-slate-100 dark:bg-[#16181d] text-slate-500 dark:text-[#717882] hover:text-black dark:hover:text-white border border-black/[0.08] dark:border-[#262a33] transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(item.channel_id, noticeText)}
                              className="p-1.5 rounded-md bg-white dark:bg-[#16181d] hover:bg-slate-100 dark:hover:bg-[#20232b] text-[#101217] dark:text-[#c1c7cd] hover:text-black dark:hover:text-white border border-black/[0.08] dark:border-[#262a33] shadow-xs transition-colors"
                              title="Edit notice"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSticky(item.channel_id)}
                              className="p-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors"
                              title="Delete notice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="w-full bg-white dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] rounded-lg p-3 text-xs text-[#101217] dark:text-white focus:outline-none focus:border-indigo-500 font-sans"
                        />
                        <div className="flex items-center gap-1.5">
                          {variables.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => insertVariable(v)}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#16181d] hover:bg-slate-200 dark:hover:bg-[#20232b] border border-black/[0.08] dark:border-[#262a33] text-[10px] font-mono text-slate-600 dark:text-[#8c949e] hover:text-black dark:hover:text-white transition-colors"
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-white dark:bg-[#14161b] border border-black/[0.08] dark:border-[#1e222a] text-xs text-slate-800 dark:text-[#c1c7cd] leading-relaxed whitespace-pre-wrap font-sans shadow-xs">
                        {noticeText}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Create Notice */}
      {activeTab === 'create' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Create Persistent Notice"
            description="Designate a channel and write the notice content that will automatically follow new messages."
          />

          <form onSubmit={handleAddSticky} className="space-y-5">
            <SettingRow
              label="Target Channel"
              description="The channel where this notice will stay pinned to the bottom."
            >
              <div className="w-72">
                <ChannelPicker
                  channels={channels}
                  value={newChannelId}
                  onChange={setNewChannelId}
                  placeholder="Select text channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#101217] dark:text-white">Notice Content</label>
                <div className="flex items-center gap-1.5">
                  {variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#16181d] hover:bg-slate-200 dark:hover:bg-[#20232b] border border-black/[0.08] dark:border-[#262a33] text-[10px] font-mono text-slate-600 dark:text-[#8c949e] hover:text-black dark:hover:text-white transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="⚠️ Remember to stay respectful and follow server guidelines."
                className="w-full bg-[#f8f9fa] dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] rounded-lg p-3 text-xs text-[#101217] dark:text-white focus:outline-none focus:border-indigo-500 font-sans"
              />
              <div className="text-right text-[10px] font-mono text-slate-400 dark:text-[#717882]">
                {newMessage.length} / 4000 characters
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.08] dark:border-[#1a1d24] flex justify-end">
              <button
                type="submit"
                disabled={isAdding || !newChannelId || !newMessage.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors disabled:opacity-40 shadow-xs"
              >
                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isAdding ? 'Dispatching...' : 'Dispatch Sticky Notice'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Variables & Documentation */}
      {activeTab === 'variables' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Dynamic Placeholders & Formatting"
            description="Variables supported inside your sticky messages that are dynamically populated by the bot."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] space-y-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                &#123;user&#125;
              </span>
              <p className="text-xs text-[#101217] dark:text-white font-medium mt-1">Author / Last Speaker</p>
              <p className="text-xs text-slate-500 dark:text-[#8c949e]">Mentions the member who triggered the sticky resurface.</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] space-y-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                &#123;server&#125;
              </span>
              <p className="text-xs text-[#101217] dark:text-white font-medium mt-1">Guild Display Name</p>
              <p className="text-xs text-slate-500 dark:text-[#8c949e]">Replaced with the server name automatically.</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] space-y-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                &#123;rules&#125;
              </span>
              <p className="text-xs text-[#101217] dark:text-white font-medium mt-1">Rules Channel Link</p>
              <p className="text-xs text-slate-500 dark:text-[#8c949e]">Resolves to the primary rules channel mention if detected.</p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] space-y-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Standard Markdown
              </span>
              <p className="text-xs text-[#101217] dark:text-white font-medium mt-1">Discord Styling</p>
              <p className="text-xs text-slate-500 dark:text-[#8c949e]">Supports bold (**text**), italics (*text*), spoilers, and links.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
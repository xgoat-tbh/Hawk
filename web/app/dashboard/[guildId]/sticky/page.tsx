'use client';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { useGuildData } from '@/context/GuildContext';
import { useToast } from '@/components/ui/Toast';
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
  Search,
  Clock,
  Radio,
  FileText,
} from 'lucide-react';

export default function StickyNoticesPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, refreshData } = useGuildData();
  const { success, error, info } = useToast();

  const stickyMessages = config?.stickyMessages || [];

  const [activeTab, setActiveTab] = useState<'notices' | 'create' | 'tokens'>('notices');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Form State
  const [newChannelId, setNewChannelId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit Form State
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Feedback Banners
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
      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
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
      const msg = `Sticky notice for #${targetChannel?.name || 'channel'} updated.`;
      setActionSuccess(msg);
      success(msg);
      setEditingChannelId(null);
      setEditContent('');
      await refreshData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Error updating sticky notice.';
      setActionError(msg);
      error(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddSticky = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelId || !newMessage.trim()) {
      setActionError('Please select a target text channel and provide message content.');
      return;
    }

    setIsAdding(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
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
      if (!res.ok) throw new Error(data.error || 'Failed to deploy sticky notice.');

      const targetChannel = channels.find((c) => c.id === newChannelId);
      const msg = `Sticky notice active in #${targetChannel?.name || 'channel'}.`;
      setNewChannelId(null);
      setNewMessage('');
      setActionSuccess(msg);
      success(msg);
      await refreshData();
      setActiveTab('notices');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Error deploying sticky notice.';
      setActionError(msg);
      error(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSticky = async (channelId: string) => {
    setIsDeleting(channelId);
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'sticky_delete',
          data: { channel_id: channelId },
        }),
      });

      if (!res.ok) throw new Error('Failed to delete notice');

      const targetChannel = channels.find((c) => c.id === channelId);
      const msg = `Sticky notice for #${targetChannel?.name || 'channel'} removed.`;
      setActionSuccess(msg);
      success(msg);
      if (editingChannelId === channelId) cancelEditing();
      await refreshData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Failed to delete sticky message.';
      setActionError(msg);
      error(msg);
    } finally {
      setIsDeleting(null);
    }
  };

  const insertToken = (token: string) => {
    if (editingChannelId) {
      setEditContent((prev) => `${prev} ${token}`);
    } else {
      setNewMessage((prev) => `${prev} ${token}`);
    }
  };

  const dynamicTokens = [
    { tag: '{user}', label: 'Member Mention' },
    { tag: '{server}', label: 'Server Name' },
    { tag: '{rules}', label: 'Rules Channel' },
    { tag: '⚠️', label: 'Warning Icon' },
    { tag: '📌', label: 'Pin Icon' },
    { tag: '✨', label: 'Sparkle Icon' },
  ];

  const filteredStickies = stickyMessages.filter((item: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const channel = channels.find((c) => c.id === item.channel_id);
    const content = (item.content || item.message || '').toLowerCase();
    const chanName = (channel?.name || '').toLowerCase();
    return content.includes(q) || chanName.includes(q) || (item.channel_id || '').includes(q);
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      <PageHeader guildId={guildId} title="Sticky notices" description="Keep recurring announcements visible in active channels." actions={<button className="btn-primary" onClick={() => setActiveTab('create')}>Create notice</button>}/>

      {/* Alert Banners */}
      {actionSuccess && (
        <div className="p-3 rounded-md bg-success/10 border border-success/20 flex items-center gap-2 text-xs font-sans text-success-text">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-success-text" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-md bg-critical/10 border border-critical/20 flex items-center gap-2 text-xs font-sans text-critical-text">
          <AlertCircle className="w-4 h-4 shrink-0 text-critical-text" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 3. Numbered Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0 font-sans text-xs">
        <button
          onClick={() => setActiveTab('notices')}
          className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'notices'
              ? 'border-success text-white font-semibold bg-surface-4/50'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>notices ({stickyMessages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'border-success text-white font-semibold bg-surface-4/50'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>new notice</span>
        </button>

        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'tokens'
              ? 'border-success text-white font-semibold bg-surface-4/50'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>tokens &amp; formatting</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: Active Notices List */}
      {activeTab === 'notices' && (
        <div className="surface-container space-y-0">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <span className="text-success-text">stickies &gt;</span>
              <span className="text-text-secondary">active notices with interval ({filteredStickies.length})</span>
            </div>
            <div className="relative w-48 sm:w-64">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="search by channel or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-7 text-[11px] py-1 font-sans"
              />
            </div>
          </div>

          {stickyMessages.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <Pin className="w-8 h-8 mx-auto text-text-muted opacity-40" />
              <p className="font-sans text-xs font-semibold text-text-primary">no sticky notices deployed</p>
              <p className="font-sans text-[11px] text-text-secondary">
                create a persistent notice to keep important guidelines visible in any channel.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn-secondary text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  deploy first notice
                </button>
              </div>
            </div>
          ) : filteredStickies.length === 0 ? (
            <div className="py-10 text-center font-sans text-xs text-text-secondary">
              no notices matching query &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredStickies.map((item: any) => {
                const targetChannel = channels.find((c) => c.id === item.channel_id);
                const noticeText = item.content || item.message || '';
                const isEditing = editingChannelId === item.channel_id;
                const isThisDeleting = isDeleting === item.channel_id;

                return (
                  <div
                    key={item.channel_id}
                    className="p-4 hover:bg-white/[0.02] transition-colors space-y-3"
                  >
                    {/* Header Row: Channel + Interval + Action buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-7 h-7 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-sans text-success-text shrink-0">
                          <Hash className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-sans text-xs font-semibold text-text-primary">
                          #{targetChannel?.name || 'unknown-channel'}
                        </span>
                        <span className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-text-secondary">
                          ID: {item.channel_id}
                        </span>

                        {/* Interval Specification Badge (Explicit User Requirement) */}
                        <span className="font-sans text-[10px] px-2 py-0.5 rounded bg-success/10 border border-success/20 text-success-text flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>INTERVAL: IMMEDIATE ON CHAT</span>
                        </span>
                        <span className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-text-muted">
                          5s anti-spam throttle
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(item.channel_id)}
                              disabled={isSavingEdit}
                              className="btn-primary py-1 px-2.5 text-[11px] flex items-center gap-1"
                            >
                              {isSavingEdit ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              <span>save notice</span>
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="btn-secondary py-1 px-2 text-[11px]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(item.channel_id, noticeText)}
                              className="btn-secondary py-1 px-2.5 text-[11px] flex items-center gap-1"
                              title="Edit notice"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSticky(item.channel_id)}
                              disabled={isThisDeleting}
                              className="btn-outline-danger py-1 px-2.5 text-[11px] flex items-center gap-1"
                              title="Delete notice"
                            >
                              {isThisDeleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              <span>delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Notice Content Body */}
                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={4}
                          maxLength={4000}
                          className="glass-input font-sans text-xs p-3 leading-relaxed w-full resize-y"
                          placeholder="write persistent announcement..."
                        />
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-sans text-[10px] text-text-muted">tokens:</span>
                            {dynamicTokens.map((t) => (
                              <button
                                key={t.tag}
                                type="button"
                                onClick={() => insertToken(t.tag)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.2] font-sans text-[10px] text-text-secondary hover:text-text-primary transition-colors"
                              >
                                {t.tag}
                              </button>
                            ))}
                          </div>
                          <span className="font-sans text-[10px] text-text-muted">
                            {editContent.length} / 4000 chars
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-md bg-surface-1 border border-white/[0.04] font-sans text-xs text-text-primary whitespace-pre-wrap leading-relaxed select-text">
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

      {/* TAB 2: Create Notice Form */}
      {activeTab === 'create' && (
        <div className="surface-container">
          <div className="panel-header">
            <span className="text-success-text">deploy &gt;</span>
            <span className="text-text-secondary">new persistent channel sticky notice</span>
          </div>

          <form onSubmit={handleAddSticky} className="p-4 sm:p-6 space-y-5">
            {/* Target Channel */}
            <div className="space-y-1.5 max-w-xl">
              <label className="block font-sans text-xs text-text-primary">
                Target Text Channel <span className="text-critical-text">*</span>
              </label>
              <p className="font-sans text-[11px] text-text-secondary">
                Select the channel where Hawk will keep this notice pinned at the bottom of the message stream.
              </p>
              <div className="pt-1">
                <ChannelPicker
                  channels={channels}
                  value={newChannelId}
                  onChange={setNewChannelId}
                  placeholder="select text channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </div>

            {/* Notice Content */}
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center justify-between">
                <label className="block font-sans text-xs text-text-primary">
                  Notice Content <span className="text-critical-text">*</span>
                </label>
                <span className="font-sans text-[10px] text-text-muted">
                  {newMessage.length} / 4000 characters
                </span>
              </div>
              <p className="font-sans text-[11px] text-text-secondary">
                Standard markdown and dynamic placeholders are parsed when dispatched to Discord.
              </p>
              <textarea
                required
                maxLength={4000}
                rows={5}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="write persistent notice content (markdown supported)..."
                className="glass-input font-sans text-xs p-3 leading-relaxed w-full resize-y"
              />

              {/* Dynamic Tokens Quick Bar */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="font-sans text-[10px] text-text-muted mr-1">insert placeholder:</span>
                {dynamicTokens.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    onClick={() => insertToken(t.tag)}
                    className="px-2 py-0.5 rounded bg-surface-4 border border-white/[0.08] hover:border-white/[0.2] font-sans text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {t.tag} ({t.label})
                  </button>
                ))}
              </div>
            </div>

            {/* Resurfacing Policy Notice */}
            <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.06] font-sans text-[11px] text-text-secondary flex items-start gap-2 max-w-3xl">
              <Zap className="w-3.5 h-3.5 text-success-text shrink-0 mt-0.5" />
              <span>
                <strong>Interval Policy:</strong> The notice is automatically deleted and re-posted at the very bottom whenever new messages are typed in the channel. A 5-second anti-rate-limit throttle ensures compliance with Discord API rate limits.
              </span>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between max-w-3xl">
              <button
                type="button"
                onClick={() => setActiveTab('notices')}
                className="btn-secondary text-xs"
              >
                cancel
              </button>

              <button
                type="submit"
                disabled={isAdding}
                className="btn-primary flex items-center gap-2 text-xs"
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Pin className="w-3.5 h-3.5" />
                )}
                <span>{isAdding ? 'deploying notice...' : 'deploy sticky notice'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Tokens & Formatting Guide */}
      {activeTab === 'tokens' && (
        <div className="surface-container">
          <div className="panel-header">
            <span className="text-success-text">tokens &gt;</span>
            <span className="text-text-secondary">dynamic message variables &amp; syntax</span>
          </div>

          <div className="p-4 sm:p-6 space-y-4 max-w-3xl">
            <p className="font-sans text-xs text-text-secondary">
              You can incorporate live dynamic variables into sticky notices. When Hawk renders the notice in Discord, these tokens are dynamically substituted with guild parameters:
            </p>

            <div className="divide-y divide-white/[0.04] border border-white/[0.06] rounded-md overflow-hidden bg-surface-1">
              <div className="p-3 flex items-start justify-between gap-4 font-sans text-xs">
                <div>
                  <span className="text-success-text font-semibold">{'{user}'}</span>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Mentions the author of the triggering message or latest chatter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => insertToken('{user}')}
                  className="btn-secondary text-[11px] py-0.5 px-2 shrink-0"
                >
                  insert
                </button>
              </div>

              <div className="p-3 flex items-start justify-between gap-4 font-sans text-xs">
                <div>
                  <span className="text-success-text font-semibold">{'{server}'}</span>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Replaced with the real server name.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => insertToken('{server}')}
                  className="btn-secondary text-[11px] py-0.5 px-2 shrink-0"
                >
                  insert
                </button>
              </div>

              <div className="p-3 flex items-start justify-between gap-4 font-sans text-xs">
                <div>
                  <span className="text-success-text font-semibold">{'{rules}'}</span>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Generates a direct channel link to the server community rules room.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => insertToken('{rules}')}
                  className="btn-secondary text-[11px] py-0.5 px-2 shrink-0"
                >
                  insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

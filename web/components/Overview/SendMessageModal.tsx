'use client';

import React, { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import { useGuildData } from '@/context/GuildContext';
import { useToast } from '@/components/ui/Toast';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendMessageModal({ isOpen, onClose, onSuccess }: SendMessageModalProps) {
  const { guildId, channels } = useGuildData();
  const { success, error } = useToast();

  const textChannels = channels.filter((c: any) => c.type === 0 || c.type === 5);
  const [selectedChannel, setSelectedChannel] = useState(textChannels[0]?.id || '');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel || !content.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/quick-actions/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: selectedChannel, content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      success('Message posted successfully!');
      setContent('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-[#121418] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#101217] dark:text-[#ededed]">Send Message as Amo Bot</h3>
              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">Post an announcement or dispatch to a channel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#94a3b8] hover:text-[#101217] dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#334155] dark:text-[#c8ccd0] mb-1.5">
              Destination Channel
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#f8fafc] dark:bg-[#17191c] border border-black/[0.08] dark:border-white/[0.08] text-[#101217] dark:text-[#ededed] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {textChannels.map((c: any) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] dark:text-[#c8ccd0] mb-1.5">
              Message Content
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message, announcement, or notice here..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#f8fafc] dark:bg-[#17191c] border border-black/[0.08] dark:border-white/[0.08] text-[#101217] dark:text-[#ededed] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-[#64748b] dark:text-[#94a3b8] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !content.trim() || !selectedChannel}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Sending...' : 'Send Message'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

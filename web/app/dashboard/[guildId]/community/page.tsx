'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
import { useGuildData } from '@/context/GuildContext';
import { MessageSquare, Lightbulb, Lock } from 'lucide-react';

export default function CommunitySettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, updateConfigLocally } = useGuildData();

  // Suggestion State
  const [sugSubmission, setSugSubmission] = useState<string | null>(null);

  // Confession State
  const [confSubmission, setConfSubmission] = useState<string | null>(null);
  const [confLog, setConfLog] = useState<string | null>(null);

  // Original State
  const [original, setOriginal] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      const sug = config.suggestion || {};
      const conf = config.confession || {};

      setSugSubmission(sug.submission_channel_id || null);
      setConfSubmission(conf.submission_channel_id || null);
      setConfLog(conf.log_channel_id || null);

      setOriginal({
        sugSubmission: sug.submission_channel_id || null,
        confSubmission: conf.submission_channel_id || null,
        confLog: conf.log_channel_id || null,
      });
    }
  }, [config]);

  const hasChanges =
    original &&
    (sugSubmission !== original.sugSubmission ||
      confSubmission !== original.confSubmission ||
      confLog !== original.confLog);

  const handleReset = () => {
    if (!original) return;
    setSugSubmission(original.sugSubmission);
    setConfSubmission(original.confSubmission);
    setConfLog(original.confLog);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        suggestion: {
          submission_channel_id: sugSubmission,
        },
        confession: {
          submission_channel_id: confSubmission,
          log_channel_id: confLog,
        },
      };

      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'community',
          data: payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

      updateConfigLocally('suggestion', payload.suggestion);
      updateConfigLocally('confession', payload.confession);

      setOriginal({
        sugSubmission,
        confSubmission,
        confLog,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-white/80" />
            <span>Community Tools</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Configure server suggestion boards, upvote workflows, and anonymous confession channels.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Suggestion System */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Suggestions System</h3>
              <p className="text-[11px] text-white/40">Automated feedback board with upvote & downvote reactions.</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Public Suggestions Channel</label>
              <ChannelSelect
                channels={channels}
                value={sugSubmission}
                onChange={setSugSubmission}
                placeholder="Select suggestions channel..."
              />
            </div>
          </div>
        </div>

        {/* Confession System */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Anonymous Confessions</h3>
              <p className="text-[11px] text-white/40">DM or modal-based anonymous confessions feed with admin audit logs.</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Public Confession Channel</label>
              <ChannelSelect
                channels={channels}
                value={confSubmission}
                onChange={setConfSubmission}
                placeholder="Select confession feed channel..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Private Admin Audit Log Channel</label>
              <ChannelSelect
                channels={channels}
                value={confLog}
                onChange={setConfLog}
                placeholder="Select admin confession log channel..."
              />
            </div>
          </div>
        </div>
      </div>

      <SaveBar
        hasChanges={Boolean(hasChanges)}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={handleReset}
        error={saveError}
        success={saveSuccess}
      />
    </div>
  );
}

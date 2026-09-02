'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
import { MessageSquare, Lightbulb, Lock } from 'lucide-react';

export default function CommunitySettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);

  // Suggestion State
  const [sugSubmission, setSugSubmission] = useState<string | null>(null);
  const [sugReview, setSugReview] = useState<string | null>(null);
  const [sugApproved, setSugApproved] = useState<string | null>(null);
  const [sugDenied, setSugDenied] = useState<string | null>(null);

  // Confession State
  const [confSubmission, setConfSubmission] = useState<string | null>(null);
  const [confLog, setConfLog] = useState<string | null>(null);

  // Original State
  const [original, setOriginal] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/guilds/${guildId}`);
        const data = await res.json();
        if (data.config) {
          const sug = data.config.suggestion || {};
          const conf = data.config.confession || {};

          setSugSubmission(sug.submission_channel_id || null);
          setSugReview(sug.review_channel_id || null);
          setSugApproved(sug.approved_channel_id || null);
          setSugDenied(sug.denied_channel_id || null);

          setConfSubmission(conf.submission_channel_id || null);
          setConfLog(conf.log_channel_id || null);

          setOriginal({
            sugSubmission: sug.submission_channel_id || null,
            sugReview: sug.review_channel_id || null,
            sugApproved: sug.approved_channel_id || null,
            sugDenied: sug.denied_channel_id || null,
            confSubmission: conf.submission_channel_id || null,
            confLog: conf.log_channel_id || null,
          });
        }
        setChannels(data.channels || []);
      } catch (err) {
        console.error('Failed to load community config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [guildId]);

  const hasChanges =
    original &&
    (sugSubmission !== original.sugSubmission ||
      sugReview !== original.sugReview ||
      sugApproved !== original.sugApproved ||
      sugDenied !== original.sugDenied ||
      confSubmission !== original.confSubmission ||
      confLog !== original.confLog);

  const handleReset = () => {
    if (!original) return;
    setSugSubmission(original.sugSubmission);
    setSugReview(original.sugReview);
    setSugApproved(original.sugApproved);
    setSugDenied(original.sugDenied);
    setConfSubmission(original.confSubmission);
    setConfLog(original.confLog);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'community',
          data: {
            suggestion: {
              submission_channel_id: sugSubmission,
              review_channel_id: sugReview,
              approved_channel_id: sugApproved,
              denied_channel_id: sugDenied,
            },
            confession: {
              submission_channel_id: confSubmission,
              log_channel_id: confLog,
            },
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

      setOriginal({
        sugSubmission,
        sugReview,
        sugApproved,
        sugDenied,
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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-surface rounded-xl w-48" />
        <div className="h-32 bg-surface rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <MessageSquare className="w-6 h-6 text-accent" />
          <span>Suggestions & Confessions</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Manage channels for anonymous confession drops and community suggestion voting.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Suggestion System */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Community Suggestions Routing</h3>
              <p className="text-xs text-muted">Set channels where suggestions are submitted, reviewed, and finalized.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Submission Channel</label>
              <ChannelSelect
                channels={channels}
                value={sugSubmission}
                onChange={setSugSubmission}
                placeholder="Select public channel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Admin Review Channel</label>
              <ChannelSelect
                channels={channels}
                value={sugReview}
                onChange={setSugReview}
                placeholder="Select staff review channel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Approved Channel</label>
              <ChannelSelect
                channels={channels}
                value={sugApproved}
                onChange={setSugApproved}
                placeholder="Select approved channel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Denied Channel</label>
              <ChannelSelect
                channels={channels}
                value={sugDenied}
                onChange={setSugDenied}
                placeholder="Select denied channel..."
              />
            </div>
          </div>
        </div>

        {/* Anonymous Confessions */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Anonymous Confessions</h3>
              <p className="text-xs text-muted">Route user confessions and private admin logs.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Public Confession Feed</label>
              <ChannelSelect
                channels={channels}
                value={confSubmission}
                onChange={setConfSubmission}
                placeholder="Select public feed channel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Private Staff Log Channel</label>
              <ChannelSelect
                channels={channels}
                value={confLog}
                onChange={setConfLog}
                placeholder="Select staff log channel..."
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

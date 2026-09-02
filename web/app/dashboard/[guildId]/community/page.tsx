'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
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
            <span>Community Feedback & Tools</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Configure server suggestion boards, voting workflows, and anonymous confession channels.
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

      <div className="space-y-8">
        {/* Suggestion System */}
        <div className="space-y-1">
          <SectionHeader
            title="Suggestion Board"
            description="Automated member feedback with upvote & downvote reaction buttons."
            icon={<Lightbulb className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Public Suggestions Channel"
              description="Text channel where new member suggestions are formatted and posted for voting."
            >
              <div className="w-64">
                <ChannelSelect
                  channels={channels}
                  value={sugSubmission}
                  onChange={setSugSubmission}
                  placeholder="Select suggestions channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Confession System */}
        <div className="space-y-1">
          <SectionHeader
            title="Anonymous Confessions"
            description="Modal-based anonymous confessions feed with administrative audit tracking."
            icon={<Lock className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Public Confessions Feed"
              description="Channel where approved anonymous confessions are posted publicly."
            >
              <div className="w-64">
                <ChannelSelect
                  channels={channels}
                  value={confSubmission}
                  onChange={setConfSubmission}
                  placeholder="Select confession feed..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Admin Confession Audit Log"
              description="Private staff channel recording author identity for moderation audits."
              badge="Private Staff"
              badgeVariant="warning"
            >
              <div className="w-64">
                <ChannelSelect
                  channels={channels}
                  value={confLog}
                  onChange={setConfLog}
                  placeholder="Select admin log channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>
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

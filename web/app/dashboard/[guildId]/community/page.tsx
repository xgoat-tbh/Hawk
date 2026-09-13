'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import {
  MessageSquare,
  Lightbulb,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface CommunityFormData {
  sugSubmission: string | null;
  confSubmission: string | null;
  confLog: string | null;
}

export default function CommunitySettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, updateConfigLocally } = useGuildData();

  const [activeTab, setActiveTab] = useState<'suggestions' | 'confessions' | 'audit'>('suggestions');

  const initialFormData = useMemo<CommunityFormData>(() => {
    const sug = config?.suggestion || {};
    const conf = config?.confession || {};
    return {
      sugSubmission: sug.submission_channel_id || null,
      confSubmission: conf.submission_channel_id || null,
      confLog: conf.log_channel_id || null,
    };
  }, [config?.suggestion, config?.confession]);

  const {
    draft,
    isDirty,
    saveState,
    error: saveError,
    setField,
    reset,
    save,
  } = useFormDraft<CommunityFormData>({
    initialData: initialFormData,
    onSave: async (formValues) => {
      const payload = {
        suggestion: {
          submission_channel_id: formValues.sugSubmission,
        },
        confession: {
          submission_channel_id: formValues.confSubmission,
          log_channel_id: formValues.confLog,
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
        throw new Error(errData.error || 'Failed to save community configuration.');
      }

      updateConfigLocally('suggestion', payload.suggestion);
      updateConfigLocally('confession', payload.confession);

      return formValues;
    },
  });

  const current = draft || initialFormData;

  const sugChan = channels.find((c) => c.id === current.sugSubmission);
  const confChan = channels.find((c) => c.id === current.confSubmission);
  const logChan = channels.find((c) => c.id === current.confLog);

  const activeHubsCount = (current.sugSubmission ? 1 : 0) + (current.confSubmission ? 1 : 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#101217] dark:text-[#f0f2f5] flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            Community Feedback & Tools
          </h1>
          <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8c949e]">
            Configure server suggestion boards, voting workflows, and anonymous confession feeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => save()}
            disabled={saveState === 'saving' || !isDirty}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <span>
              {saveState === 'saving'
                ? 'Saving...'
                : saveState === 'success'
                ? '✓ Saved'
                : 'Save Changes'}
            </span>
          </button>
        </div>
      </div>

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Suggestions Board"
          value={sugChan ? `#${sugChan.name}` : 'Unconfigured'}
          subtitle="Public voting channel"
          icon={Lightbulb}
        />
        <StatCard
          title="Confessions Feed"
          value={confChan ? `#${confChan.name}` : 'Unconfigured'}
          subtitle="Anonymous community feed"
          icon={Lock}
        />
        <StatCard
          title="Moderation Audit Log"
          value={logChan ? `#${logChan.name}` : 'Disabled'}
          subtitle="Private staff author logs"
          icon={ShieldCheck}
        />
        <StatCard
          title="Active Hubs"
          value={`${activeHubsCount} / 2`}
          subtitle="Live interaction modules"
          icon={Sparkles}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08] dark:border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'suggestions'
              ? 'border-indigo-500 text-indigo-600 dark:text-white'
              : 'border-transparent text-gray-500 dark:text-[#717882] hover:text-gray-700 dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Suggestions Board
        </button>

        <button
          onClick={() => setActiveTab('confessions')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'confessions'
              ? 'border-indigo-500 text-indigo-600 dark:text-white'
              : 'border-transparent text-gray-500 dark:text-[#717882] hover:text-gray-700 dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Lock className="w-4 h-4" />
          Anonymous Confessions
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-indigo-500 text-indigo-600 dark:text-white'
              : 'border-transparent text-gray-500 dark:text-[#717882] hover:text-gray-700 dark:hover:text-[#c1c7cd]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Audit & Staff Security
        </button>
      </div>

      {/* TAB 1: Suggestions */}
      {activeTab === 'suggestions' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Suggestion Board Architecture"
            description="Automated member feedback with upvote & downvote reaction buttons for community voting."
          />

          <SettingRow
            label="Public Suggestions Channel"
            description="Text channel where new member suggestions are formatted and posted for voting."
            badge={current.sugSubmission ? 'Active' : 'Unset'}
            badgeVariant={current.sugSubmission ? 'success' : 'neutral'}
          >
            <div className="w-64">
              <ChannelPicker
                channels={channels}
                value={current.sugSubmission}
                onChange={(val) => setField('sugSubmission', val)}
                placeholder="Select suggestions channel..."
                allowedTypes={[0, 5]}
              />
            </div>
          </SettingRow>
        </div>
      )}

      {/* TAB 2: Confessions */}
      {activeTab === 'confessions' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Anonymous Confessions Feed"
            description="Modal-based anonymous confessions feed enabling members to share secrets without revealing their username."
          />

          <SettingRow
            label="Public Confessions Feed Channel"
            description="Channel where approved anonymous confessions are posted publicly for member viewing."
            badge={current.confSubmission ? 'Active' : 'Unset'}
            badgeVariant={current.confSubmission ? 'success' : 'neutral'}
          >
            <div className="w-64">
              <ChannelPicker
                channels={channels}
                value={current.confSubmission}
                onChange={(val) => setField('confSubmission', val)}
                placeholder="Select confession feed..."
                allowedTypes={[0, 5]}
              />
            </div>
          </SettingRow>
        </div>
      )}

      {/* TAB 3: Audit */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Confession Moderation & Safety"
            description="Administrative logging to protect server safety while maintaining anonymity for standard members."
          />

          <SettingRow
            label="Admin Confession Audit Log"
            description="Private staff channel recording author identity for moderation audits if TOS or server rules are broken."
            badge="Staff Only"
            badgeVariant="warning"
          >
            <div className="w-64">
              <ChannelPicker
                channels={channels}
                value={current.confLog}
                onChange={(val) => setField('confLog', val)}
                placeholder="Select staff log channel..."
                allowedTypes={[0]}
              />
            </div>
          </SettingRow>
        </div>
      )}

      <SaveBar
        isDirty={isDirty}
        saveState={saveState}
        onSave={save}
        onReset={reset}
        error={saveError}
      />
    </div>
  );
}

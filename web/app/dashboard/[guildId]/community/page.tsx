'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { MessageSquare, Lightbulb, Lock } from 'lucide-react';

interface CommunityFormData {
  sugSubmission: string | null;
  confSubmission: string | null;
  confLog: string | null;
}

export default function CommunitySettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const containerRef = usePageEntrance();
  const { channels, config, updateConfigLocally } = useGuildData();

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

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#a9adb2]" />
            <span>Community Feedback & Tools</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
            Configure server suggestion boards, voting workflows, and anonymous confession channels.
          </p>
        </div>

        <button
          type="button"
          onClick={() => save()}
          disabled={saveState === 'saving' || !isDirty}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{saveState === 'saving' ? 'Saving...' : saveState === 'success' ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* Suggestion System */}
        <div className="space-y-1" data-animate-section>
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
                  value={current.sugSubmission}
                  onChange={(val) => setField('sugSubmission', val)}
                  placeholder="Select suggestions channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Confession System */}
        <div className="space-y-1" data-animate-section>
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
                  value={current.confSubmission}
                  onChange={(val) => setField('confSubmission', val)}
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
                  value={current.confLog}
                  onChange={(val) => setField('confLog', val)}
                  placeholder="Select admin log channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>
          </div>
        </div>
      </div>

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

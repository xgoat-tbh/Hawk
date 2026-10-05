'use client';
import { apiFetch } from '@/lib/api';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SaveBar } from '@/components/SaveBar';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toggle } from '@/components/ui/Toggle';

interface CommunityFormData {
  sugSubmission: string | null;
  sugEnabled: boolean;
  confSubmission: string | null;
  confEnabled: boolean;
  confLog: string | null;
}

export default function CommunitySettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, updateConfigLocally } = useGuildData();



  const initialFormData = useMemo<CommunityFormData>(() => {
    const sug = config?.suggestion || {};
    const conf = config?.confession || {};
    return {
      sugSubmission: sug.submission_channel_id || null,
      sugEnabled: Boolean(sug.submission_channel_id),
      confSubmission: conf.submission_channel_id || null,
      confEnabled: Boolean(conf.submission_channel_id),
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
    autoSaveMs: 1500, initialData: initialFormData,
    onSave: async (formValues) => {
      if (formValues.sugEnabled && !formValues.sugSubmission) throw new Error('Choose a suggestions channel.');
      if (formValues.confEnabled && !formValues.confSubmission) throw new Error('Choose a confessions channel.');
      const payload = {
        suggestion: {
          submission_channel_id: formValues.sugEnabled ? formValues.sugSubmission : null,
        },
        confession: {
          submission_channel_id: formValues.confEnabled ? formValues.confSubmission : null,
          log_channel_id: formValues.confLog,
        },
      };

      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
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

      return { ...formValues, sugSubmission: payload.suggestion.submission_channel_id, confSubmission: payload.confession.submission_channel_id };
    },
  });

  const current = draft || initialFormData;

  return <div className="hawk-page max-w-5xl">
    <PageHeader guildId={guildId} title="Community tools" description="Give members a place to share ideas and anonymous confessions."/>
    <section className="settings-section"><h2>Suggestions</h2>
      <div className="setting-row"><div><label>Enable suggestions</label><p>Publish submissions for community voting.</p></div><Toggle label="Enable suggestions" checked={current.sugEnabled} onChange={v => setField('sugEnabled', v)}/></div>
      <div className="setting-row"><div><label htmlFor="suggestion-channel">Suggestions channel</label><p>Where member ideas and reactions appear.</p></div><ChannelPicker id="suggestion-channel" label="Suggestions channel" channels={channels} value={current.sugSubmission} onChange={v => setField('sugSubmission', v)}/></div>
    </section>
    <section className="settings-section"><h2>Confessions</h2>
      <div className="setting-row"><div><label>Enable confessions</label><p>Allow members to submit anonymous messages.</p></div><Toggle label="Enable confessions" checked={current.confEnabled} onChange={v => setField('confEnabled', v)}/></div>
      <div className="setting-row"><div><label htmlFor="confession-channel">Confessions channel</label><p>Where anonymous submissions are published.</p></div><ChannelPicker id="confession-channel" label="Confessions channel" channels={channels} value={current.confSubmission} onChange={v => setField('confSubmission', v)}/></div>
      <div className="setting-row"><div><label htmlFor="confession-log">Author audit channel</label><p>Records the author of each confession. Choose a channel restricted to your staff.</p></div><ChannelPicker id="confession-log" label="Author audit channel" channels={channels} value={current.confLog} onChange={v => setField('confLog', v)}/></div>
    </section>
    <SaveBar isDirty={isDirty} saveState={saveState} onSave={save} onReset={reset} error={saveError}/>
  </div>;
}

'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { RolePicker } from '@/components/ui/RolePicker';
import { SaveBar } from '@/components/SaveBar';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useToast } from '@/components/ui/Toast';
import {
  Sliders,
  Terminal,
  FileText,
  Globe,
  Shield,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Hash,
  ChevronRight,
} from 'lucide-react';

interface GeneralFormData {
  prefix: string;
  logChannelId: string | null;
  auditChannelId: string | null;
  botCommanderRoleId: string | null;
}

export default function GeneralSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, roles, config, updateConfigLocally, refreshData } = useGuildData();
  const { success, error } = useToast();



  const initialFormData = useMemo<GeneralFormData>(() => {
    const gen = config?.general || {};
    return {
      prefix: gen.prefix || '!',
      logChannelId: gen.log_channel_id || null,
      auditChannelId: gen.audit_channel_id || null,
      botCommanderRoleId: gen.bot_commander_role_id || null,
    };
  }, [config?.general]);

  const {
    draft,
    isDirty,
    saveState,
    error: saveError,
    setField,
    reset,
    save,
  } = useFormDraft<GeneralFormData>({
    autoSaveMs: 1500, initialData: initialFormData,
    onSave: async (formValues) => {
      if (!/^\S{1,5}$/.test(formValues.prefix)) throw new Error('Prefix must contain 1–5 characters without spaces.');
      const payload = {
        prefix: formValues.prefix,
        log_channel_id: formValues.logChannelId,
        audit_channel_id: formValues.auditChannelId,
        bot_commander_role_id: formValues.botCommanderRoleId,
      };

      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'general',
          data: payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        const msg = errData.error || 'Failed to save general configuration.';
        error(msg);
        throw new Error(msg);
      }

      updateConfigLocally('general', payload);
      success('General server settings saved');
      await refreshData();
      return { ...formValues, prefix: payload.prefix };
    },
  });

  const current = draft || initialFormData;

  return <div className="max-w-5xl mx-auto space-y-4">
    <PageHeader guildId={guildId} title="General settings" description="Set how members interact with Hawk and where server events are recorded."
      actions={<button className="btn-secondary" onClick={() => refreshData()} disabled={isDirty}><RefreshCw size={14} className="mr-2"/>Refresh</button>}/>
    <section className="hawk-settings-section" aria-labelledby="commands-heading">
      <h2 id="commands-heading">Commands & authority</h2>
      <div className="setting-row">
        <div><label htmlFor="command-prefix">Command prefix</label><p>The symbol before a text command. Up to five characters.</p></div>
        <div><input id="command-prefix" className="glass-input font-mono max-w-32" value={current.prefix} maxLength={5} onChange={e => setField('prefix', e.target.value)} aria-describedby="prefix-hint"/><p id="prefix-hint" className="mt-2 text-xs text-text-muted">Example: <code>{current.prefix || '!'}help</code></p></div>
      </div>
      <div className="setting-row">
        <div><label htmlFor="commander-role">Bot commander role</label><p>Members of this role receive elevated bot authority. Review membership before assigning it.</p></div>
        <RolePicker id="commander-role" label="Bot commander role" roles={roles} value={current.botCommanderRoleId} onChange={v => setField('botCommanderRoleId', v)}/>
      </div>
    </section>
    <section className="hawk-settings-section" aria-labelledby="logging-heading">
      <h2 id="logging-heading">Event routing</h2>
      <div className="setting-row"><div><label htmlFor="audit-channel">Server activity channel</label><p>Member updates, role changes, and moderation events.</p></div><ChannelPicker id="audit-channel" label="Server activity channel" channels={channels} value={current.logChannelId} onChange={v => setField('logChannelId', v)}/></div>
      <div className="setting-row"><div><label htmlFor="economy-channel">Economy log channel</label><p>Store purchases, transfers, and salary payouts.</p></div><ChannelPicker id="economy-channel" label="Economy log channel" channels={channels} value={current.auditChannelId} onChange={v => setField('auditChannelId', v)}/></div>
    </section>
    <div className="flex items-start gap-3 text-text-muted text-xs py-3"><Clock size={16} className="shrink-0"/><p>Event timestamps are stored in UTC. Your changes apply to this server only.</p></div>
    <SaveBar isDirty={isDirty} saveState={saveState} onSave={save} onReset={reset} error={saveError}/>
  </div>;
}

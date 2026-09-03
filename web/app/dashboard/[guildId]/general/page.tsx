'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { RolePicker } from '@/components/ui/RolePicker';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { Sliders, Terminal, FileText, Globe } from 'lucide-react';

interface GeneralFormData {
  prefix: string;
  logChannelId: string | null;
  auditChannelId: string | null;
  botCommanderRoleId: string | null;
}

export default function GeneralSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, roles, config, updateConfigLocally, loading } = useGuildData();
  const containerRef = usePageEntrance(!loading);

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
    initialData: initialFormData,
    onSave: async (formValues) => {
      const payload = {
        prefix: formValues.prefix.trim() || '!',
        log_channel_id: formValues.logChannelId,
        audit_channel_id: formValues.auditChannelId,
        bot_commander_role_id: formValues.botCommanderRoleId,
      };

      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'general',
          data: payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save general configuration.');
      }

      updateConfigLocally('general', payload);
      return formValues;
    },
  });

  const current = draft || initialFormData;

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17191c] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#ededed] tracking-tight flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#949aa2]" />
            <span>General Server Settings</span>
          </h1>
          <p className="text-xs text-[#6e747c] mt-0.5">
            Configure bot command prefix, administrator authority role, and server audit logging channels.
          </p>
        </div>

        <button
          type="button"
          onClick={() => save()}
          disabled={saveState === 'saving' || !isDirty}
          className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{saveState === 'saving' ? 'Saving...' : saveState === 'success' ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* Core Settings Section */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Core Bot Configuration"
            description="Fundamental prefix and elevated role settings."
            icon={<Terminal className="w-3.5 h-3.5 text-[#6e747c]" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Command Prefix"
              description="The prefix symbol required before executing text commands in channels."
              badge="Prefix"
            >
              <input
                type="text"
                value={current.prefix}
                maxLength={5}
                onChange={(e) => setField('prefix', e.target.value)}
                className="glass-input font-mono text-xs w-28 text-center"
                placeholder="!"
              />
            </SettingRow>

            <SettingRow
              label="Bot Commander Role"
              description="Members holding this role receive elevated moderation authority and bypass standard command checks."
              badge="Elevated"
              badgeVariant="warning"
            >
              <div className="w-64">
                <RolePicker
                  roles={roles}
                  value={current.botCommanderRoleId}
                  onChange={(val) => setField('botCommanderRoleId', val)}
                  placeholder="Select commander role..."
                />
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Logging & Audit Channels */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Logging & Audit Channels"
            description="Dedicated channels where Hawk dispatches moderation, system, and economy logs."
            icon={<FileText className="w-3.5 h-3.5 text-[#6e747c]" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Audit Log Channel"
              description="Dispatches member joins, leaves, role updates, and administrative command invocations."
              badge="Routing"
            >
              <div className="w-64">
                <ChannelPicker
                  channels={channels}
                  value={current.logChannelId}
                  onChange={(val) => setField('logChannelId', val)}
                  placeholder="Select audit channel..."
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Economy & Mod Log Channel"
              description="Dispatches store purchases, balance transfers, role salaries, and economy audit actions."
              badge="Routing"
            >
              <div className="w-64">
                <ChannelPicker
                  channels={channels}
                  value={current.auditChannelId}
                  onChange={(val) => setField('auditChannelId', val)}
                  placeholder="Select economy log channel..."
                />
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Regional & System Standards */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="System Standards"
            description="Timestamps, audit standards, and regional format."
            icon={<Globe className="w-3.5 h-3.5 text-[#6e747c]" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Audit Timezone Standard"
              description="All server events, voice logs, and database records use standard UTC ISO 8601 formatting."
              badge="Standard"
            >
              <span className="text-xs font-mono text-[#949aa2] bg-[#121417] px-2.5 py-1 rounded border border-[#1f2226]">
                UTC (Universal Coordinated Time)
              </span>
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

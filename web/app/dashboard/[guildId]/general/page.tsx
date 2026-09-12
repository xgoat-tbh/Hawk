'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { RolePicker } from '@/components/ui/RolePicker';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import {
  Sliders,
  Terminal,
  FileText,
  Globe,
  Shield,
  Clock,
  RefreshCw,
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

  const [activeTab, setActiveTab] = useState<'core' | 'logging' | 'standards'>('core');

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
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0f2f5] flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-400" />
            General Server Settings
          </h1>
          <p className="mt-1 text-xs text-[#8c949e]">
            Configure bot command prefix, administrator authority role, and server audit logging channels.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshData()}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14161b] hover:bg-[#1c1f26] border border-[#20242c] text-[#c1c7cd] hover:text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh State
        </button>
      </div>

      {/* StatCards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Command Prefix"
          value={current.prefix || '!'}
          subtitle="Trigger prefix for text commands"
          icon={Terminal}
        />
        <StatCard
          title="Bot Commander Role"
          value={current.botCommanderRoleId ? '@Configured' : 'None'}
          subtitle="Elevated authority override"
          icon={Shield}
        />
        <StatCard
          title="Audit Log Channel"
          value={current.logChannelId ? '#Active' : 'Unset'}
          subtitle="System & member activity logs"
          icon={FileText}
        />
        <StatCard
          title="Economy Log Channel"
          value={current.auditChannelId ? '#Active' : 'Unset'}
          subtitle="Financial & moderation stream"
          icon={Globe}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('core')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'core'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Core Configuration
        </button>

        <button
          onClick={() => setActiveTab('logging')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'logging'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <FileText className="w-4 h-4" />
          Logging & Audits
        </button>

        <button
          onClick={() => setActiveTab('standards')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'standards'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Globe className="w-4 h-4" />
          System Standards
        </button>
      </div>

      {/* TAB 1: Core Configuration */}
      {activeTab === 'core' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="Core Bot Configuration"
            description="Fundamental prefix and elevated role settings."
          />

          <SettingRow
            label="Command Prefix"
            description="The prefix symbol required before executing text commands in channels."
          >
            <input
              type="text"
              value={current.prefix}
              maxLength={5}
              onChange={(e) => setField('prefix', e.target.value)}
              className="bg-[#14161b] border border-[#20242c] rounded-lg px-3 py-1.5 font-mono text-xs w-28 text-center text-white focus:outline-none focus:border-indigo-500"
              placeholder="!"
            />
          </SettingRow>

          <SettingRow
            label="Bot Commander Role"
            description="Members holding this role receive elevated moderation authority and bypass standard command checks."
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
      )}

      {/* TAB 2: Logging & Audits */}
      {activeTab === 'logging' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="Logging & Audit Channels"
            description="Dedicated channels where Hawk dispatches moderation, system, and economy logs."
          />

          <SettingRow
            label="Audit Log Channel"
            description="Dispatches member joins, leaves, role updates, and administrative command invocations."
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
      )}

      {/* TAB 3: System Standards */}
      {activeTab === 'standards' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SectionHeader
            title="System Standards"
            description="Timestamps, audit standards, and regional format."
          />

          <SettingRow
            label="Audit Timezone Standard"
            description="All server events, voice logs, and database records use standard UTC ISO 8601 formatting."
          >
            <span className="text-xs font-mono text-[#949aa2] bg-[#14161b] px-3 py-1.5 rounded-lg border border-[#20242c] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              UTC (Universal Coordinated Time)
            </span>
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

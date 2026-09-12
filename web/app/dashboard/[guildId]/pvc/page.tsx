'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Radio,
  Clock,
  Lock,
  Unlock,
  EyeOff,
  Trash2,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useToast } from '@/components/ui/Toast';
import { usePolling } from '@/hooks/usePolling';

interface LiveSession {
  channelId: string;
  ownerId: string;
  autoPayEnabled: boolean;
  isLocked: boolean;
  isHidden: boolean;
  userLimit: number;
  createdAt: string;
  expiresAt: string;
}

interface PvcFormData {
  pvcHourlyRate: number;
  pvcJtcChannelId: string | null;
  pvcCategoryId: string | null;
  pvcCommandChannelId: string | null;
  pvcPanelChannelId: string | null;
}

interface PersonalDefaults {
  defaultName: string;
  defaultLimit: number;
  defaultBitrate: number;
  isLocked: boolean;
}

export default function PvcDashboardPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, updateConfigLocally } = useGuildData();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'live' | 'config' | 'presets'>('live');

  // Live Sessions State
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [terminateTarget, setTerminateTarget] = useState<string | null>(null);
  const [terminating, setTerminating] = useState(false);

  // Personal Defaults State
  const [personalDefaults, setPersonalDefaults] = useState<PersonalDefaults>({
    defaultName: '',
    defaultLimit: 0,
    defaultBitrate: 64000,
    isLocked: false,
  });
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Fetch Live Sessions
  const fetchLiveSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/pvc/live`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to fetch live sessions:', err);
    }
  }, [guildId]);

  // Fetch Personal Defaults
  const fetchPersonalDefaults = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/pvc/defaults`);
      if (res.ok) {
        const data = await res.json();
        if (data.defaults) {
          setPersonalDefaults({
            defaultName: data.defaults.defaultName || '',
            defaultLimit: Number(data.defaults.defaultLimit ?? 0),
            defaultBitrate: Number(data.defaults.defaultBitrate ?? 64000),
            isLocked: Boolean(data.defaults.isLocked),
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch personal defaults:', err);
    }
  }, [guildId]);

  // 5s real-time live polling
  usePolling(fetchLiveSessions, { intervalMs: 5000 });

  useEffect(() => {
    fetchLiveSessions();
    fetchPersonalDefaults();
  }, [fetchLiveSessions, fetchPersonalDefaults]);

  // Server PVC Configuration Draft
  const initialFormData = useMemo<PvcFormData>(() => {
    const eco = config?.economy || {};
    return {
      pvcHourlyRate: Number(eco.pvc_hourly_rate) || 100,
      pvcJtcChannelId: eco.pvc_jtc_channel_id || null,
      pvcCategoryId: eco.pvc_category_id || null,
      pvcCommandChannelId: eco.pvc_command_channel_id || null,
      pvcPanelChannelId: eco.pvc_panel_channel_id || null,
    };
  }, [config?.economy]);

  const {
    draft,
    isDirty,
    saveState,
    error: saveError,
    setField,
    reset,
    save,
  } = useFormDraft<PvcFormData>({
    initialData: initialFormData,
    onSave: async (formValues) => {
      const payload = {
        pvc_hourly_rate: formValues.pvcHourlyRate,
        pvc_jtc_channel_id: formValues.pvcJtcChannelId,
        pvc_category_id: formValues.pvcCategoryId,
        pvc_command_channel_id: formValues.pvcCommandChannelId,
        pvc_panel_channel_id: formValues.pvcPanelChannelId,
      };

      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'pvc', data: payload }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save PVC configuration');
      }

      const result = await res.json();
      updateConfigLocally('economy', result.data);
      toast.success('PVC configuration saved successfully!');
    },
  });

  // Handle Terminate Live Session
  const handleTerminateSession = async () => {
    if (!terminateTarget) return;
    setTerminating(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/pvc/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', channelId: terminateTarget }),
      });
      if (res.ok) {
        toast.success(`Terminated PVC channel ${terminateTarget}`);
        setTerminateTarget(null);
        fetchLiveSessions();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to terminate session');
      }
    } catch {
      toast.error('Network error terminating session');
    } finally {
      setTerminating(false);
    }
  };

  // Save Personal Defaults
  const handleSavePersonalDefaults = async () => {
    setSavingPersonal(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/pvc/defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personalDefaults),
      });
      if (res.ok) {
        toast.success('Your personal PVC preferences have been saved!');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save personal defaults');
      }
    } catch {
      toast.error('Network error saving defaults');
    } finally {
      setSavingPersonal(false);
    }
  };

  // Live session columns
  const sessionColumns: Column<LiveSession>[] = [
    {
      key: 'channelId',
      header: 'Channel ID',
      render: (row) => (
        <span className="font-mono text-xs text-[#ededed]">{row.channelId}</span>
      ),
    },
    {
      key: 'ownerId',
      header: 'Owner',
      render: (row) => (
        <span className="font-mono text-xs text-[#8c949e]">{row.ownerId}</span>
      ),
    },
    {
      key: 'status',
      header: 'Security / State',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          {row.isLocked ? (
            <span className="flex items-center gap-1 text-rose-400 font-medium px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
              <Lock className="w-3 h-3" /> Locked
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <Unlock className="w-3 h-3" /> Open
            </span>
          )}
          {row.isHidden && (
            <span className="flex items-center gap-1 text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              <EyeOff className="w-3 h-3" /> Hidden
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'userLimit',
      header: 'Limit',
      render: (row) => (
        <span className="text-xs text-[#c1c7cd]">
          {row.userLimit === 0 ? 'No limit' : `${row.userLimit} users`}
        </span>
      ),
    },
    {
      key: 'autoPayEnabled',
      header: 'Auto-Pay',
      render: (row) => (
        <span className={`text-xs font-semibold ${row.autoPayEnabled ? 'text-emerald-400' : 'text-[#717882]'}`}>
          {row.autoPayEnabled ? 'Active' : 'Off'}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expires At',
      render: (row) => (
        <span className="text-[11px] text-[#717882]">
          {new Date(row.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => setTerminateTarget(row.channelId)}
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
          title="Terminate Session"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0f2f5] flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-indigo-400" />
            Private Voice Channels (PVC)
          </h1>
          <p className="mt-1 text-xs text-[#8c949e]">
            Configure join-to-create voice hubs, monitor live channel telemetry, and adjust personal voice presets.
          </p>
        </div>

        <button
          onClick={() => {
            fetchLiveSessions();
            toast.info('Live PVC state refreshed.');
          }}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14161b] hover:bg-[#1c1f26] border border-[#20242c] text-[#c1c7cd] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Live
        </button>
      </div>

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Channels"
          value={sessions.length}
          subtitle="Currently active PVCs"
          icon={Radio}
        />
        <StatCard
          title="Hourly Rental Rate"
          value={`$${draft?.pvcHourlyRate ?? 100}/hr`}
          subtitle="Rental fee deducted per hour"
          icon={Clock}
        />
        <StatCard
          title="Auto-Pay Sessions"
          value={sessions.filter((s) => s.autoPayEnabled).length}
          subtitle="Channels set to auto-renew"
          icon={Zap}
        />
        <StatCard
          title="Protected Channels"
          value={sessions.filter((s) => s.isLocked).length}
          subtitle="Password/Lock protected"
          icon={Lock}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('live')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'live'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Radio className="w-4 h-4" />
          Live Channels ({sessions.length})
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'config'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Hub Configuration
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'presets'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          My Personal Presets
        </button>
      </div>

      {/* TAB 1: Live Channels */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          <DataTable
            columns={sessionColumns}
            data={sessions}
            pageSize={10}
            emptyMessage="No active PVC channels currently running."
            rowKey={(s) => s.channelId}
          />
        </div>
      )}

      {/* TAB 2: Hub Configuration */}
      {activeTab === 'config' && draft && (
        <div className="space-y-6">
          <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
            <SectionHeader
              title="Hub & Channel Architecture"
              description="Designate the Join-to-Create trigger channel and category where dynamic voice channels spawn."
            />

            <SettingRow
              label="Join-to-Create (JTC) Channel"
              description="Users connecting to this channel will automatically trigger a new private voice room."
            >
              <div className="w-64">
                <ChannelPicker
                  value={draft.pvcJtcChannelId}
                  onChange={(val) => setField('pvcJtcChannelId', val)}
                  channels={channels.filter((c: any) => c.type === 2)}
                  placeholder="Select voice channel..."
                />
              </div>
            </SettingRow>

            <SettingRow
              label="PVC Spawn Category"
              description="The Discord category where newly created rooms are placed."
            >
              <div className="w-64">
                <ChannelPicker
                  value={draft.pvcCategoryId}
                  onChange={(val) => setField('pvcCategoryId', val)}
                  channels={channels.filter((c: any) => c.type === 4)}
                  placeholder="Select category..."
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Management Commands Channel"
              description="Channel designated for bot PVC commands and interaction buttons."
            >
              <div className="w-64">
                <ChannelPicker
                  value={draft.pvcCommandChannelId}
                  onChange={(val) => setField('pvcCommandChannelId', val)}
                  channels={channels.filter((c: any) => c.type === 0)}
                  placeholder="Select text channel..."
                />
              </div>
            </SettingRow>
          </div>

          <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
            <SectionHeader
              title="Economy & Rental Rates"
              description="Set financial costs for keeping temporary voice channels active."
            />

            <SettingRow
              label="Hourly Rental Rate"
              description="Amount deducted per hour from room owner's wallet or bank."
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#717882]">$</span>
                <input
                  type="number"
                  min={0}
                  value={draft.pvcHourlyRate}
                  onChange={(e) => setField('pvcHourlyRate', Number(e.target.value))}
                  className="w-32 px-3 py-1.5 text-xs bg-[#121418] border border-[#20242c] rounded-lg text-[#ededed] focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-[#717882]">/ hour</span>
              </div>
            </SettingRow>
          </div>
        </div>
      )}

      {/* TAB 3: Personal Presets */}
      {activeTab === 'presets' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5 max-w-2xl">
          <SectionHeader
            title="Personal Room Defaults"
            description="Whenever you create a new private voice channel, your room will automatically inherit these settings."
          />

          <SettingRow
            label="Default Room Name"
            description="Leave blank to use default server formatting."
          >
            <input
              type="text"
              maxLength={32}
              value={personalDefaults.defaultName}
              onChange={(e) => setPersonalDefaults((p) => ({ ...p, defaultName: e.target.value }))}
              placeholder="e.g. Secret Hideout"
              className="w-64 px-3 py-1.5 text-xs bg-[#121418] border border-[#20242c] rounded-lg text-[#ededed] focus:outline-none focus:border-indigo-500"
            />
          </SettingRow>

          <div className="pt-2">
            <RangeSlider
              label="Default User Limit"
              value={personalDefaults.defaultLimit}
              onChange={(val) => setPersonalDefaults((p) => ({ ...p, defaultLimit: val }))}
              min={0}
              max={99}
              unit=" users"
              description="0 means unlimited capacity."
            />
          </div>

          <div className="pt-2">
            <RangeSlider
              label="Audio Quality (Bitrate)"
              value={personalDefaults.defaultBitrate}
              onChange={(val) => setPersonalDefaults((p) => ({ ...p, defaultBitrate: val }))}
              min={8000}
              max={384000}
              step={8000}
              unit=" bps"
              description="Default standard is 64,000 bps."
            />
          </div>

          <SettingRow
            label="Default Locked State"
            description="If enabled, rooms will be locked to outsiders as soon as they spawn."
          >
            <input
              type="checkbox"
              checked={personalDefaults.isLocked}
              onChange={(e) => setPersonalDefaults((p) => ({ ...p, isLocked: e.target.checked }))}
              className="w-4 h-4 rounded bg-[#121418] border-[#20242c] text-indigo-500 focus:ring-0 cursor-pointer"
            />
          </SettingRow>

          <div className="pt-4 border-t border-[#1a1d24] flex justify-end">
            <button
              onClick={handleSavePersonalDefaults}
              disabled={savingPersonal}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              {savingPersonal ? 'Saving...' : 'Save My Presets'}
            </button>
          </div>
        </div>
      )}

      {/* Terminate Session Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(terminateTarget)}
        onClose={() => setTerminateTarget(null)}
        onConfirm={handleTerminateSession}
        title="Terminate Private Voice Room"
        description={`Are you sure you want to forcibly terminate PVC channel ${terminateTarget}? Connected users will be disconnected and session will be removed from database.`}
        confirmLabel="Terminate Room"
        variant="danger"
        isLoading={terminating}
      />

      {/* Save Bar */}
      <SaveBar
        isDirty={isDirty}
        saveState={saveState}
        error={saveError}
        onSave={save}
        onReset={reset}
      />
    </div>
  );
}

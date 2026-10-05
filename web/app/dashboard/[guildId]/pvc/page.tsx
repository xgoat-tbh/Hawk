'use client';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Radio,
  Lock,
  Unlock,
  EyeOff,
  Trash2,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SaveBar } from '@/components/SaveBar';
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
  autoCleanup: boolean;
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
      const res = await apiFetch(`/api/guilds/${guildId}/pvc/live`);
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
      const res = await apiFetch(`/api/guilds/${guildId}/pvc/defaults`);
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
      autoCleanup: true,
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
    autoSaveMs: 1500, initialData: initialFormData,
    onSave: async (formValues) => {
      const payload = {
        pvc_hourly_rate: formValues.pvcHourlyRate,
        pvc_jtc_channel_id: formValues.pvcJtcChannelId,
        pvc_category_id: formValues.pvcCategoryId,
        pvc_command_channel_id: formValues.pvcCommandChannelId,
        pvc_panel_channel_id: formValues.pvcPanelChannelId,
      };

      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
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
      const res = await apiFetch(`/api/guilds/${guildId}/pvc/manage`, {
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
      const res = await apiFetch(`/api/guilds/${guildId}/pvc/defaults`, {
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
        <span className="font-sans text-xs text-text-primary">{row.channelId}</span>
      ),
    },
    {
      key: 'ownerId',
      header: 'Owner Snowflake',
      render: (row) => (
        <span className="font-sans text-xs text-text-secondary">{row.ownerId}</span>
      ),
    },
    {
      key: 'status',
      header: 'State',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-sans text-xs">
          {row.isLocked ? (
            <span className="console-tag text-critical-text bg-critical/10 border-critical/25">
              <Lock className="w-3 h-3 mr-1 inline" /> LOCKED
            </span>
          ) : (
            <span className="console-tag text-success-text bg-success/10 border-success/25">
              <Unlock className="w-3 h-3 mr-1 inline" /> OPEN
            </span>
          )}
          {row.isHidden && (
            <span className="console-tag text-warning-text bg-warning/10 border-warning/25">
              <EyeOff className="w-3 h-3 mr-1 inline" /> HIDDEN
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'userLimit',
      header: 'Capacity',
      render: (row) => (
        <span className="font-sans text-xs text-text-primary">
          {row.userLimit === 0 ? 'Unlimited' : `${row.userLimit} max`}
        </span>
      ),
    },
    {
      key: 'autoPayEnabled',
      header: 'Auto-Pay',
      render: (row) => (
        <span className={`font-sans text-xs ${row.autoPayEnabled ? 'text-success-text' : 'text-text-secondary'}`}>
          {row.autoPayEnabled ? 'Active' : 'Off'}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expires At',
      render: (row) => (
        <span className="font-sans text-[11px] text-text-secondary">
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
          className="btn-outline-danger py-1 px-2 text-[11px] font-sans"
          title="Terminate Session"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          terminate
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-24 font-sans">
      <PageHeader guildId={guildId} title="Private voice" description="Configure voice hubs and manage active private channels." actions={<button
            onClick={() => {
              fetchLiveSessions();
            }}
            className="btn-secondary"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh live
          </button>}/>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Active PVCs</span>
            <span className="console-tag console-tag-voice">LIVE</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-text-primary tracking-tight">
            {sessions.length}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            active temporary voice rooms
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Rental Rate</span>
            <span className="console-tag console-tag-economy">RATE</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-success-text tracking-tight">
            ${draft?.pvcHourlyRate ?? 100}/hr
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            hourly deduction fee
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Auto-Pay Channels</span>
            <span className="console-tag console-tag-readv">AUTO</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-text-primary tracking-tight">
            {sessions.filter((s) => s.autoPayEnabled).length}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            channels with auto-renew
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-[11px] font-sans text-text-secondary">
            <span>Locked Channels</span>
            <span className="console-tag console-tag-readv">LOCK</span>
          </div>
          <div className="mt-2 text-xl font-bold font-sans text-text-primary tracking-tight">
            {sessions.filter((s) => s.isLocked).length}
          </div>
          <div className="mt-1 text-[10px] font-sans text-text-muted">
            password / lock protected
          </div>
        </div>
      </div>

      {/* Terminal Tab Strip */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-2 text-xs font-sans">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'live'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>live channels ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'config'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>hub configuration</span>
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'presets'
              ? 'bg-surface-4 text-text-primary border border-white/[0.08]'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>personal presets</span>
        </button>
      </div>

      {/* TAB 1: Live Channels */}
      {activeTab === 'live' && (
        <div className="surface-container">
          <div className="panel-header">
            <span>real-time active voice rooms</span>
            <span className="text-text-secondary">{sessions.length} sessions</span>
          </div>
          <DataTable
            columns={sessionColumns}
            data={sessions}
            pageSize={10}
            emptyMessage="No active private voice rooms currently running."
            rowKey={(s) => s.channelId}
          />
        </div>
      )}

      {/* TAB 2: Hub Configuration */}
      {activeTab === 'config' && draft && (
        <div className="space-y-4 font-sans">
          <div className="surface-container p-4 space-y-4">
            <div className="panel-header -mx-4 -mt-4 mb-4">
              <span>join-to-create hub architecture</span>
            </div>

            <div className="space-y-1 pb-3 border-b border-white/[0.04]">
              <label className="text-xs text-text-primary font-semibold block">Join-to-Create (JTC) Voice Channel</label>
              <div className="text-[11px] text-text-secondary">Connecting to this trigger channel automatically provisions a private room for the user.</div>
              <div className="pt-2 max-w-md">
                <ChannelPicker
                  value={draft.pvcJtcChannelId}
                  onChange={(val) => setField('pvcJtcChannelId', val)}
                  channels={channels.filter((c: any) => c.type === 2)}
                  placeholder="Select trigger voice channel..."
                />
              </div>
            </div>

            <div className="space-y-1 pb-3 border-b border-white/[0.04]">
              <label className="text-xs text-text-primary font-semibold block">PVC Spawn Category</label>
              <div className="text-[11px] text-text-secondary">The Discord category where newly provisioned voice rooms are created.</div>
              <div className="pt-2 max-w-md">
                <ChannelPicker
                  value={draft.pvcCategoryId}
                  onChange={(val) => setField('pvcCategoryId', val)}
                  channels={channels.filter((c: any) => c.type === 4)}
                  placeholder="Select target category..."
                />
              </div>
            </div>

            <div className="space-y-1 pb-3 border-b border-white/[0.04]">
              <label className="text-xs text-text-primary font-semibold block">Management Commands Channel</label>
              <div className="text-[11px] text-text-secondary">Channel designated for bot interaction buttons and room commands.</div>
              <div className="pt-2 max-w-md">
                <ChannelPicker
                  value={draft.pvcCommandChannelId}
                  onChange={(val) => setField('pvcCommandChannelId', val)}
                  channels={channels.filter((c: any) => c.type === 0)}
                  placeholder="Select text commands channel..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
              <div>
                <div className="text-xs text-text-primary font-semibold">Auto-Cleanup Empty Rooms</div>
                <div className="text-[11px] text-text-secondary">Automatically delete channels when all members disconnect.</div>
              </div>
              <input
                type="checkbox"
                checked={draft.autoCleanup}
                onChange={(e) => setField('autoCleanup', e.target.checked)}
                className="w-4 h-4 rounded bg-surface-1 border border-white/[0.08] text-success-text focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs text-text-primary font-semibold">Hourly Rental Rate ($)</div>
                <div className="text-[11px] text-text-secondary">Cost deducted from room owner's bank balance each hour.</div>
              </div>
              <input
                type="number"
                min={0}
                value={draft.pvcHourlyRate}
                onChange={(e) => setField('pvcHourlyRate', Number(e.target.value))}
                className="glass-input font-sans w-32 text-right"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Personal Presets */}
      {activeTab === 'presets' && (
        <div className="surface-container p-4 space-y-4 max-w-2xl font-sans">
          <div className="panel-header -mx-4 -mt-4 mb-4">
            <span>personal room defaults</span>
            <span className="text-text-secondary">user preferences</span>
          </div>

          <div className="space-y-1 pb-3 border-b border-white/[0.04]">
            <label className="text-xs text-text-primary font-semibold block">Default Room Name</label>
            <div className="text-[11px] text-text-secondary">Naming template used whenever you create a private voice channel.</div>
            <div className="pt-2">
              <input
                type="text"
                maxLength={32}
                value={personalDefaults.defaultName}
                onChange={(e) => setPersonalDefaults((p) => ({ ...p, defaultName: e.target.value }))}
                placeholder="e.g. {username}'s Lounge"
                className="glass-input font-sans"
              />
            </div>
          </div>

          <div className="pb-3 border-b border-white/[0.04]">
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

          <div className="pb-3 border-b border-white/[0.04]">
            <RangeSlider
              label="Default Bitrate Quality"
              value={personalDefaults.defaultBitrate}
              onChange={(val) => setPersonalDefaults((p) => ({ ...p, defaultBitrate: val }))}
              min={8000}
              max={384000}
              step={8000}
              unit=" bps"
              description="Voice audio fidelity (64,000 bps recommended)."
            />
          </div>

          <div className="flex items-center justify-between gap-3 pb-3">
            <div>
              <div className="text-xs text-text-primary font-semibold">Spawn Locked by Default</div>
              <div className="text-[11px] text-text-secondary">Immediately locks the room when created so only permitted users can join.</div>
            </div>
            <input
              type="checkbox"
              checked={personalDefaults.isLocked}
              onChange={(e) => setPersonalDefaults((p) => ({ ...p, isLocked: e.target.checked }))}
              className="w-4 h-4 rounded bg-surface-1 border border-white/[0.08] text-success-text focus:ring-0 cursor-pointer"
            />
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex justify-end">
            <button
              onClick={handleSavePersonalDefaults}
              disabled={savingPersonal}
              className="btn-primary"
            >
              {savingPersonal ? 'saving...' : 'save presets'}
            </button>
          </div>
        </div>
      )}

      {/* Terminate Session Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(terminateTarget)}
        onClose={() => setTerminateTarget(null)}
        onConfirm={handleTerminateSession}
        title="// terminate voice room"
        description={`Are you sure you want to forcibly terminate PVC channel ${terminateTarget}? Connected users will be disconnected and session removed from database.`}
        confirmLabel="terminate room"
        variant="danger"
        isLoading={terminating}
      />

      {/* Save Bar for Server PVC Config */}
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

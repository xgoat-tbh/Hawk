'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { Radio, Clock, LayoutTemplate, Loader2, Plus, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface PvcFormData {
  pvcHourlyRate: number;
  pvcJtcChannelId: string | null;
  pvcCategoryId: string | null;
  pvcCommandChannelId: string | null;
  pvcPanelChannelId: string | null;
}

export default function PvcSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const containerRef = usePageEntrance();
  const { channels, config, updateConfigLocally, refreshData } = useGuildData();

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
        body: JSON.stringify({
          module: 'pvc',
          data: payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save PVC configuration.');
      }

      updateConfigLocally('economy', {
        ...(config?.economy || {}),
        ...payload,
      });

      return formValues;
    },
  });

  const current = draft || initialFormData;
  const currencySymbol = config?.economy?.currency_symbol || '$';

  // Auto setup state
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [autoCreateStatus, setAutoCreateStatus] = useState<string | null>(null);
  const [autoCreateError, setAutoCreateError] = useState<string | null>(null);

  const handleAutoCreatePvc = async () => {
    setIsAutoCreating(true);
    setAutoCreateStatus(null);
    setAutoCreateError(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/setup-pvc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to auto-create channels');

      setField('pvcCategoryId', data.categoryId);
      setField('pvcJtcChannelId', data.jtcChannelId);

      await refreshData();
      setAutoCreateStatus('Voice Category & Join-to-Create voice channel generated.');
      setTimeout(() => setAutoCreateStatus(null), 5000);
    } catch (err: any) {
      setAutoCreateError(err.message || 'Failed to auto-create PVC channels.');
      setTimeout(() => setAutoCreateError(null), 5000);
    } finally {
      setIsAutoCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#a9adb2]" />
            <span>Private Voice Channels (PVC)</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
            Configure automated temporary voice rooms, hourly rental rates, and master control panels.
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

      {autoCreateStatus && (
        <div className="p-3 rounded-md bg-success-soft border border-success-border flex items-center gap-2 text-xs text-success-text">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{autoCreateStatus}</span>
        </div>
      )}
      {autoCreateError && (
        <div className="p-3 rounded-md bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 text-critical shrink-0" />
          <span>{autoCreateError}</span>
        </div>
      )}

      {/* Auto Channel Setup Banner */}
      <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold text-[#f1f2f3] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#a9adb2]" />
            <span>1-Click Auto Setup</span>
          </h3>
          <p className="text-[11px] text-[#7e8389]">
            Automatically create the dedicated Discord category and Join-to-Create master channel.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAutoCreatePvc}
          disabled={isAutoCreating}
          className="btn-outline-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
        >
          {isAutoCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          <span>Generate Channels</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* Voice Infrastructure */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Voice Container Routing"
            description="Channels and categories where temporary private rooms are created."
            icon={<LayoutTemplate className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Join-to-Create Voice Channel"
              description="Members who connect to this voice channel will instantly be moved to a newly created private room."
              badge="Trigger"
            >
              <div className="w-64">
                <ChannelSelect
                  channels={channels}
                  value={current.pvcJtcChannelId}
                  onChange={(val) => setField('pvcJtcChannelId', val)}
                  placeholder="Select Join-to-Create channel..."
                  allowedTypes={[2, 13]}
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Parent Voice Category"
              description="Discord category container where dynamic private voice rooms are placed."
            >
              <div className="w-64">
                <ChannelSelect
                  channels={channels}
                  value={current.pvcCategoryId}
                  onChange={(val) => setField('pvcCategoryId', val)}
                  placeholder="Select Category container..."
                  allowedTypes={[4]}
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Persistent Control Panel Channel"
              description="Text channel containing interactive button controls for room management."
            >
              <div className="w-64">
                <ChannelSelect
                  channels={channels}
                  value={current.pvcPanelChannelId}
                  onChange={(val) => setField('pvcPanelChannelId', val)}
                  placeholder="Select Panel channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Economy Rates */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Rental Rates & Pricing"
            description="Economy fees for voice room ownership."
            icon={<Clock className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Hourly Voice Rental Rate"
              description="Amount deducted from the voice channel owner's wallet per hour of active voice rental."
            >
              <div className="relative w-36">
                <input
                  type="number"
                  min={0}
                  value={current.pvcHourlyRate}
                  onChange={(e) => setField('pvcHourlyRate', parseInt(e.target.value, 10) || 0)}
                  className="glass-input font-mono text-xs pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#7e8389]">
                  {currencySymbol}
                </span>
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

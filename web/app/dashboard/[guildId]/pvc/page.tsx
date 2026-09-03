'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { Radio, Clock, LayoutTemplate, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface PvcFormData {
  pvcHourlyRate: number;
  pvcJtcChannelId: string | null;
  pvcCategoryId: string | null;
  pvcCommandChannelId: string | null;
  pvcPanelChannelId: string | null;
}

export default function PvcSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, updateConfigLocally, refreshData, loading } = useGuildData();
  const containerRef = usePageEntrance(!loading);

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
      if (data.panelChannelId) setField('pvcPanelChannelId', data.panelChannelId);

      await refreshData();
      setAutoCreateStatus('Channels provisioned directly in Discord!');
      setTimeout(() => setAutoCreateStatus(null), 5000);
    } catch (err: any) {
      setAutoCreateError(err.message || 'Auto setup encountered an error.');
    } finally {
      setIsAutoCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17191c] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#ededed] tracking-tight flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#949aa2]" />
            <span>Private Voice Channels (PVC)</span>
          </h1>
          <p className="text-xs text-[#6e747c] mt-0.5">
            Configure Join-to-Create dynamic temporary voice rooms and hourly rental rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAutoCreatePvc}
            disabled={isAutoCreating}
            className="btn-outline-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Auto-provision Discord category and Join-To-Create channel"
          >
            {isAutoCreating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-warning" />
            )}
            <span>{isAutoCreating ? 'Provisioning...' : 'Auto-Setup in Discord'}</span>
          </button>

          <button
            type="button"
            onClick={() => save()}
            disabled={saveState === 'saving' || !isDirty}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>{saveState === 'saving' ? 'Saving...' : saveState === 'success' ? '✓ Saved' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Auto Provisioning Feedback Banners */}
      {autoCreateStatus && (
        <div className="p-3.5 rounded-lg bg-success-soft border border-success-border text-xs text-success-text flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{autoCreateStatus}</span>
        </div>
      )}

      {autoCreateError && (
        <div className="p-3.5 rounded-lg bg-critical-soft border border-critical-border text-xs text-critical-text flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{autoCreateError}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* Generator & Category Channels */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Voice Room Routing & Hierarchy"
            description="Discord category and trigger channel for automated voice spawning."
            icon={<LayoutTemplate className="w-3.5 h-3.5 text-[#6e747c]" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Join-To-Create Trigger Channel"
              description="Members who connect to this voice channel are instantly moved into their own private room."
              badge="Voice"
            >
              <div className="w-64">
                <ChannelPicker
                  channels={channels}
                  allowedTypes={[2, 13]} // Voice and Stage channels
                  value={current.pvcJtcChannelId}
                  onChange={(val) => setField('pvcJtcChannelId', val)}
                  placeholder="Select JTC voice channel..."
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Target Category Container"
              description="The Discord category under which dynamically generated voice channels are created."
              badge="Category"
            >
              <div className="w-64">
                <ChannelPicker
                  channels={channels}
                  allowedTypes={[4]} // Category channels only
                  value={current.pvcCategoryId}
                  onChange={(val) => setField('pvcCategoryId', val)}
                  placeholder="Select category..."
                />
              </div>
            </SettingRow>

            <SettingRow
              label="PVC Control Panel Channel"
              description="Dedicated text channel where the interactive PVC button control panel is posted."
              badge="Text"
            >
              <div className="w-64">
                <ChannelPicker
                  channels={channels}
                  allowedTypes={[0, 5]} // Text and Announcement
                  value={current.pvcPanelChannelId}
                  onChange={(val) => setField('pvcPanelChannelId', val)}
                  placeholder="Select panel channel..."
                />
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Pricing & Rental Rates */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Rental Economics"
            description="Fee deducted from the channel owner's wallet for keeping a private channel open."
            icon={<Clock className="w-3.5 h-3.5 text-[#6e747c]" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Hourly Channel Rental Fee"
              description="Currency deducted every hour while the private room remains active. Set to 0 for free rooms."
              badge="Fee"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#6e747c]">{currencySymbol}</span>
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  value={current.pvcHourlyRate}
                  onChange={(e) => setField('pvcHourlyRate', Number(e.target.value))}
                  className="glass-input font-mono text-xs w-36"
                />
                <span className="text-[11px] text-[#6e747c]">/ hour</span>
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

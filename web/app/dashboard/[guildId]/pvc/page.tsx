'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useGuildData } from '@/context/GuildContext';
import { Radio, Clock, LayoutTemplate, Loader2, Plus, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PvcSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, config, updateConfigLocally, refreshData } = useGuildData();

  // Form State
  const [pvcHourlyRate, setPvcHourlyRate] = useState(100);
  const [pvcJtcChannelId, setPvcJtcChannelId] = useState<string | null>(null);
  const [pvcCategoryId, setPvcCategoryId] = useState<string | null>(null);
  const [pvcCommandChannelId, setPvcCommandChannelId] = useState<string | null>(null);
  const [pvcPanelChannelId, setPvcPanelChannelId] = useState<string | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  // Original State
  const [original, setOriginal] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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

      setPvcCategoryId(data.categoryId);
      setPvcJtcChannelId(data.jtcChannelId);

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

  useEffect(() => {
    if (config?.economy) {
      const eco = config.economy;
      setPvcHourlyRate(Number(eco.pvc_hourly_rate) || 100);
      setPvcJtcChannelId(eco.pvc_jtc_channel_id || null);
      setPvcCategoryId(eco.pvc_category_id || null);
      setPvcCommandChannelId(eco.pvc_command_channel_id || null);
      setPvcPanelChannelId(eco.pvc_panel_channel_id || null);
      setCurrencySymbol(eco.currency_symbol || '$');

      setOriginal({
        pvcHourlyRate: Number(eco.pvc_hourly_rate) || 100,
        pvcJtcChannelId: eco.pvc_jtc_channel_id || null,
        pvcCategoryId: eco.pvc_category_id || null,
        pvcCommandChannelId: eco.pvc_command_channel_id || null,
        pvcPanelChannelId: eco.pvc_panel_channel_id || null,
      });
    }
  }, [config]);

  const hasChanges =
    original &&
    (pvcHourlyRate !== original.pvcHourlyRate ||
      pvcJtcChannelId !== original.pvcJtcChannelId ||
      pvcCategoryId !== original.pvcCategoryId ||
      pvcCommandChannelId !== original.pvcCommandChannelId ||
      pvcPanelChannelId !== original.pvcPanelChannelId);

  const handleReset = () => {
    if (!original) return;
    setPvcHourlyRate(original.pvcHourlyRate);
    setPvcJtcChannelId(original.pvcJtcChannelId);
    setPvcCategoryId(original.pvcCategoryId);
    setPvcCommandChannelId(original.pvcCommandChannelId);
    setPvcPanelChannelId(original.pvcPanelChannelId);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        pvc_hourly_rate: pvcHourlyRate,
        pvc_jtc_channel_id: pvcJtcChannelId,
        pvc_category_id: pvcCategoryId,
        pvc_command_channel_id: pvcCommandChannelId,
        pvc_panel_channel_id: pvcPanelChannelId,
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
        throw new Error(errData.error || 'Failed to save');
      }

      updateConfigLocally('economy', {
        ...(config?.economy || {}),
        ...payload,
      });

      setOriginal({
        pvcHourlyRate,
        pvcJtcChannelId,
        pvcCategoryId,
        pvcCommandChannelId,
        pvcPanelChannelId,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-4 h-4 text-white/80" />
            <span>Private Voice Channels (PVC)</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Configure automated temporary voice rooms, hourly rental rates, and master control panels.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {autoCreateStatus && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{autoCreateStatus}</span>
        </div>
      )}
      {autoCreateError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{autoCreateError}</span>
        </div>
      )}

      {/* Auto Channel Setup Banner */}
      <div className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-white/60" />
            <span>1-Click Auto Setup</span>
          </h3>
          <p className="text-[11px] text-white/40">
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
        <div className="space-y-1">
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
                  value={pvcJtcChannelId}
                  onChange={setPvcJtcChannelId}
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
                  value={pvcCategoryId}
                  onChange={setPvcCategoryId}
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
                  value={pvcPanelChannelId}
                  onChange={setPvcPanelChannelId}
                  placeholder="Select Panel channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Economy Rates */}
        <div className="space-y-1">
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
                  value={pvcHourlyRate}
                  onChange={(e) => setPvcHourlyRate(parseInt(e.target.value, 10) || 0)}
                  className="glass-input font-mono text-xs pl-8"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-white/40">
                  {currencySymbol}
                </span>
              </div>
            </SettingRow>
          </div>
        </div>
      </div>

      <SaveBar
        hasChanges={Boolean(hasChanges)}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={handleReset}
        error={saveError}
        success={saveSuccess}
      />
    </div>
  );
}

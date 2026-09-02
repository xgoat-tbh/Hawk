'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
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

      // Refresh channels from Discord
      await refreshData();

      setAutoCreateStatus('Private Voice Category & Join-to-Create voice channel created.');
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
            Automatic temporary voice channels with FASTag autopay, owner control panels, and rental rates.
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

      {/* Auto Create Status Alerts */}
      {autoCreateStatus && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{autoCreateStatus}</span>
        </div>
      )}
      {autoCreateError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{autoCreateError}</span>
        </div>
      )}

      {/* 1-Click Auto Setup Card */}
      <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-medium text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-white/60" />
            <span>1-Click Auto Channel Generator</span>
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            Automatically create the dedicated Discord category and Join-to-Create voice channel.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Hourly Rental Rate */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Hourly Rental Rate</h3>
              <p className="text-[11px] text-white/40">Cost in server currency per hour of voice channel rental.</p>
            </div>
          </div>

          <div className="space-y-1 max-w-xs pt-1">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={pvcHourlyRate}
                onChange={(e) => setPvcHourlyRate(parseInt(e.target.value, 10) || 0)}
                className="glass-input font-mono text-xs pl-8"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono text-xs">
                {currencySymbol}
              </span>
            </div>
          </div>
        </div>

        {/* Join to Create Channel */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Join-to-Create Channel</h3>
              <p className="text-[11px] text-white/40">Voice channel members join to automatically create a private room.</p>
            </div>
          </div>

          <div className="pt-1">
            <ChannelSelect
              channels={channels}
              value={pvcJtcChannelId}
              onChange={setPvcJtcChannelId}
              placeholder="Select Join-to-Create channel..."
              allowedTypes={[2, 13]}
            />
          </div>
        </div>

        {/* PVC Parent Category */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Voice Category Container</h3>
              <p className="text-[11px] text-white/40">Discord category where dynamic voice channels are created.</p>
            </div>
          </div>

          <div className="pt-1">
            <ChannelSelect
              channels={channels}
              value={pvcCategoryId}
              onChange={setPvcCategoryId}
              placeholder="Select Category container..."
              allowedTypes={[4]}
            />
          </div>
        </div>

        {/* PVC Control Panel Channel */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Persistent Control Panel Channel</h3>
              <p className="text-[11px] text-white/40">Channel containing interactive button panel for voice management.</p>
            </div>
          </div>

          <div className="pt-1">
            <ChannelSelect
              channels={channels}
              value={pvcPanelChannelId}
              onChange={setPvcPanelChannelId}
              placeholder="Select Master Panel channel..."
              allowedTypes={[0, 5]}
            />
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

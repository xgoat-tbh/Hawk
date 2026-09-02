'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
import { Radio, Clock, Folder, MessageSquare, LayoutTemplate } from 'lucide-react';

export default function PvcSettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);

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

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/guilds/${guildId}`);
        const data = await res.json();
        if (data.config?.economy) {
          const eco = data.config.economy;
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
        setChannels(data.channels || []);
      } catch (err) {
        console.error('Failed to load PVC config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [guildId]);

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
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'pvc',
          data: {
            pvc_hourly_rate: pvcHourlyRate,
            pvc_jtc_channel_id: pvcJtcChannelId,
            pvc_category_id: pvcCategoryId,
            pvc_command_channel_id: pvcCommandChannelId,
            pvc_panel_channel_id: pvcPanelChannelId,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-surface rounded-xl w-48" />
        <div className="h-32 bg-surface rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Radio className="w-6 h-6 text-accent" />
          <span>Private Voice Channels (PVC)</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Configure Join-to-Create voice hubs, hourly rental economy fees, and interactive dashboard panels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Join to Create Setup */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Join-to-Create Channel & Category</h3>
              <p className="text-xs text-muted">When members join the trigger channel, a new private room is spawned.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Trigger Voice Channel</label>
              <ChannelSelect
                channels={channels}
                value={pvcJtcChannelId}
                onChange={setPvcJtcChannelId}
                allowedTypes={[2]}
                placeholder="Select voice channel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Spawn Category</label>
              <ChannelSelect
                channels={channels}
                value={pvcCategoryId}
                onChange={setPvcCategoryId}
                allowedTypes={[4]}
                placeholder="Select category..."
              />
            </div>
          </div>
        </div>

        {/* Economy & Hourly Rate */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Hourly Room Rental Fee</h3>
              <p className="text-xs text-muted">Cost in server currency per hour to keep a PVC active (0 for free).</p>
            </div>
          </div>

          <div className="max-w-xs pt-2 space-y-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Rate Per Hour ({currencySymbol})</label>
            <input
              type="number"
              value={pvcHourlyRate}
              min={0}
              onChange={(e) => setPvcHourlyRate(parseInt(e.target.value) || 0)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white font-medium focus:outline-none focus:border-accent"
              placeholder="100"
            />
          </div>
        </div>

        {/* Command & Control Panel Channels */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Dedicated Command & Panel Channels</h3>
              <p className="text-xs text-muted">Channels where members execute PVC commands and access the persistent control panel.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">PVC Command Channel</label>
              <ChannelSelect
                channels={channels}
                value={pvcCommandChannelId}
                onChange={setPvcCommandChannelId}
                placeholder="Select text channel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Control Panel Channel</label>
              <ChannelSelect
                channels={channels}
                value={pvcPanelChannelId}
                onChange={setPvcPanelChannelId}
                placeholder="Select panel channel..."
              />
            </div>
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

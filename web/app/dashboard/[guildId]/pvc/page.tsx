'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
import { SyncLoader } from '@/components/SyncLoader';
import { Radio, Clock, LayoutTemplate, Loader2, Plus, Trash2 } from 'lucide-react';


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
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [autoCreateStatus, setAutoCreateStatus] = useState<string | null>(null);

  const handleAutoCreatePvc = async () => {
    setIsAutoCreating(true);
    setAutoCreateStatus(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/setup-pvc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to auto-create channels');

      setPvcCategoryId(data.categoryId);
      setPvcJtcChannelId(data.jtcChannelId);

      // Refresh channels list
      const gRes = await fetch(`/api/guilds/${guildId}`);
      const gData = await gRes.json();
      if (gData.channels) setChannels(gData.channels);

      setAutoCreateStatus('✓ "🔊 PRIVATE VOICE" category & "➕ Join to Create" voice channel created!');
      setTimeout(() => setAutoCreateStatus(null), 5000);
    } catch (err: any) {
      setAutoCreateStatus(`Failed: ${err.message}`);
      setTimeout(() => setAutoCreateStatus(null), 5000);
    } finally {
      setIsAutoCreating(false);
    }
  };

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
    return <SyncLoader title="Syncing Private Voice Channels" subtitle="Connecting with Discord voice state and hourly room rental configurations..." />;
  }


  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-[#5865F2]" />
            <span>Private Voice Channels (PVC)</span>
          </h1>
          <p className="text-xs text-white/50 mt-1 font-medium">
            Configure Join-to-Create voice hubs, hourly rental economy fees, and interactive dashboard panels.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="btn-outline-primary text-xs py-2 px-4 flex items-center gap-2 self-start sm:self-auto disabled:opacity-40"
        >
          <span>{isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Join to Create Setup */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Join-to-Create Channel & Category</h3>
                <p className="text-xs text-white/40">When members join the trigger channel, a new private room is spawned.</p>
              </div>
            </div>
            <button
              type="button"
              disabled={isAutoCreating}
              onClick={handleAutoCreatePvc}
              className="btn-outline-primary text-xs py-2 px-3 flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isAutoCreating ? 'Creating in Discord...' : '1-Click Auto-Create Channels'}</span>
            </button>
          </div>

          {autoCreateStatus && (
            <div
              className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                autoCreateStatus.startsWith('✓')
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {autoCreateStatus}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Trigger Voice Channel</label>
              <ChannelSelect
                channels={channels}
                value={pvcJtcChannelId}
                onChange={setPvcJtcChannelId}
                allowedTypes={[2]}
                placeholder="Select voice channel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Spawn Category</label>
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
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">Hourly Room Rental Fee</h3>
              <p className="text-xs text-white/40">Cost in server currency per hour to keep a PVC active (0 for free).</p>
            </div>
          </div>

          <div className="max-w-xs pt-2 space-y-2">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Rate Per Hour ({currencySymbol})</label>
            <input
              type="number"
              value={pvcHourlyRate}
              min={0}
              onChange={(e) => setPvcHourlyRate(parseInt(e.target.value) || 0)}
              className="glass-input font-bold"
              placeholder="100"
            />
          </div>
        </div>

        {/* Command & Control Panel Channels */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">Dedicated Command & Panel Channels</h3>
              <p className="text-xs text-white/40">Channels where members execute PVC commands and access the persistent control panel.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">PVC Command Channel</label>
              <ChannelSelect
                channels={channels}
                value={pvcCommandChannelId}
                onChange={setPvcCommandChannelId}
                placeholder="Select text channel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Control Panel Channel</label>
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

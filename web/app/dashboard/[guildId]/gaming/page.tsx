'use client';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RolePicker } from '@/components/ui/RolePicker';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { useGuildData } from '@/context/GuildContext';
import { useToast } from '@/components/ui/Toast';
import {
  Gamepad2,
  Plus,
  Trash2,
  Volume2,
  Shield,
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Search,
} from 'lucide-react';

interface GamePreset {
  slug: string;
  name: string;
}

const POPULAR_GAME_PRESETS: GamePreset[] = [
  { slug: 'valorant', name: 'Valorant Competitive' },
  { slug: 'cs2', name: 'Counter-Strike 2' },
  { slug: 'apex', name: 'Apex Legends Ranked' },
  { slug: 'overwatch', name: 'Overwatch 2' },
  { slug: 'lol', name: 'League of Legends' },
  { slug: 'rocket', name: 'Rocket League' },
  { slug: 'dota2', name: 'Dota 2 Matchmaking' },
  { slug: 'fortnite', name: 'Fortnite Battle Royale' },
];

export default function GamingLfgPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, roles, config, refreshData, updateConfigLocally } = useGuildData();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'triggers' | 'create' | 'routing'>('triggers');

  const gamePings = config?.gamePings || [];
  const testChannelId = config?.gameTestChannel || null;
  const testChannel = channels.find((c) => c.id === testChannelId);

  // Search/filter active triggers
  const [searchQuery, setSearchQuery] = useState('');

  // New Trigger Form State
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [newRoleId, setNewRoleId] = useState<string | null>(null);
  const [newVcId, setNewVcId] = useState<string | null>(null);
  const [newCooldown, setNewCooldown] = useState('1200');

  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyPreset = (preset: GamePreset) => {
    setNewIdentifier(preset.slug);
    setNewGameName(preset.name);
  };

  const handleAddTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newIdentifier.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanName = newGameName.trim();

    if (!cleanId || !cleanName || !newRoleId || !newVcId) {
      setActionError('All trigger fields are required (trigger word slug, game title, ping role, voice channel).');
      return;
    }

    setIsAdding(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'gaming_add_ping',
          data: {
            identifier: cleanId,
            game_name: cleanName,
            role_id: newRoleId,
            vc_id: newVcId,
            cooldown_seconds: parseInt(newCooldown, 10) || 1200,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create gaming trigger');

      setNewIdentifier('');
      setNewGameName('');
      setNewRoleId(null);
      setNewVcId(null);
      setNewCooldown('1200');
      setActionSuccess(`Configured LFG trigger [${cleanId}] for ${cleanName}.`);
      success(`LFG trigger [${cleanId}] deployed`);
      await refreshData();
      setActiveTab('triggers');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Error creating trigger';
      setActionError(msg);
      error(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTrigger = async (identifier: string) => {
    setIsDeleting(identifier);
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'gaming_delete_ping',
          data: { identifier },
        }),
      });

      if (!res.ok) throw new Error('Failed to delete trigger');

      await refreshData();
      setActionSuccess(`Removed trigger [${identifier}].`);
      success(`Trigger [${identifier}] deleted`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      const msg = err.message || 'Failed to delete trigger';
      setActionError(msg);
      error(msg);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveTestChannel = async (channelId: string | null) => {
    updateConfigLocally('gameTestChannel', channelId);
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'gaming_set_test_channel',
          data: { channel_id: channelId },
        }),
      });

      if (!res.ok) throw new Error('Failed to update announcement channel');
      const target = channels.find((c) => c.id === channelId);
      setActionSuccess(channelId ? `Announcement routing configured to #${target?.name || channelId}.` : 'Announcement routing disabled.');
      success('LFG announcement channel saved');
      await refreshData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      const msg = err.message || 'Failed to save announcement channel';
      setActionError(msg);
      error(msg);
    }
  };

  const filteredPings = gamePings.filter((ping: any) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (ping.identifier || '').toLowerCase().includes(q) ||
      (ping.game_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      <PageHeader guildId={guildId} title="Gaming LFG" description="Connect players with game triggers and role notifications." actions={<button className="btn-primary" onClick={() => setActiveTab('create')}>Create trigger</button>}/>

      {/* Alert Banners */}
      {actionSuccess && (
        <div className="p-3 rounded-md bg-success/10 border border-success/20 flex items-center gap-2 text-xs font-sans text-success-text">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-success-text" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-md bg-critical/10 border border-critical/20 flex items-center gap-2 text-xs font-sans text-critical-text">
          <AlertCircle className="w-4 h-4 shrink-0 text-critical-text" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 3. Numbered Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0 font-sans text-xs">
        <button
          onClick={() => setActiveTab('triggers')}
          className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'triggers'
              ? 'border-success text-white font-semibold bg-surface-4/50'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>triggers ({gamePings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'border-success text-white font-semibold bg-surface-4/50'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>new trigger</span>
        </button>

        <button
          onClick={() => setActiveTab('routing')}
          className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'routing'
              ? 'border-success text-white font-semibold bg-surface-4/50'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>routing channel</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: Active Triggers List */}
      {activeTab === 'triggers' && (
        <div className="surface-container space-y-0">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <span className="text-success-text">triggers &gt;</span>
              <span className="text-text-secondary">active voice triggers ({filteredPings.length})</span>
            </div>
            <div className="relative w-48 sm:w-64">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="search triggers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input pl-7 text-[11px] py-1 font-sans"
              />
            </div>
          </div>

          {gamePings.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <Gamepad2 className="w-8 h-8 mx-auto text-text-muted opacity-40" />
              <p className="font-sans text-xs font-semibold text-text-primary">no gaming triggers configured</p>
              <p className="font-sans text-[11px] text-text-secondary">
                create an LFG trigger to ping member roles when players enter voice channels.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn-secondary text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  configure first trigger
                </button>
              </div>
            </div>
          ) : filteredPings.length === 0 ? (
            <div className="py-10 text-center font-sans text-xs text-text-secondary">
              no triggers matching query &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredPings.map((ping: any) => {
                const role = roles.find((r) => r.id === ping.role_id);
                const vc = channels.find((c) => c.id === ping.vc_id);
                const isThisDeleting = isDeleting === ping.identifier;

                return (
                  <div
                    key={ping.identifier}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-sans text-success-text shrink-0">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-sans text-xs font-semibold text-text-primary truncate">
                            {ping.game_name}
                          </span>
                          <span className="font-sans text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-text-secondary">
                            slug: {ping.identifier}
                          </span>
                        </div>
                        <div className="font-sans text-[11px] text-text-muted flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-text-secondary flex items-center gap-1">
                            <Volume2 className="w-3 h-3 text-text-muted" />
                            {vc ? `#${vc.name}` : ping.vc_id}
                          </span>
                          <span>•</span>
                          <span className="text-success-text flex items-center gap-1">
                            <Shield className="w-3 h-3 text-success-text/70" />
                            @{role ? role.name : ping.role_id}
                          </span>
                          <span>•</span>
                          <span className="text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3 text-text-muted" />
                            {ping.cooldown_seconds || 1200}s cooldown
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => handleDeleteTrigger(ping.identifier)}
                        disabled={isThisDeleting}
                        className="btn-outline-danger py-1 px-2.5 text-[11px] flex items-center gap-1.5"
                        title="Delete trigger"
                      >
                        {isThisDeleting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        <span>delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: New Trigger Form */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          {/* Quick Preset Selector */}
          <div className="surface-container p-3.5 space-y-2">
            <div className="font-sans text-xs text-text-secondary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-success-text" />
              <span>quick game presets (click to populate):</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {POPULAR_GAME_PRESETS.map((preset) => (
                <button
                  key={preset.slug}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 rounded bg-surface-4 border border-white/[0.08] hover:border-white/[0.2] hover:bg-[var(--surface-2)] text-[11px] font-sans text-text-primary transition-colors cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-container">
            <div className="panel-header">
              <span className="text-success-text">configure &gt;</span>
              <span className="text-text-secondary">new lfg trigger &amp; custom game</span>
            </div>

            <form onSubmit={handleAddTrigger} className="p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Trigger Identifier / Word */}
                <div className="space-y-1.5">
                  <label className="block font-sans text-xs text-text-primary">
                    Trigger Word / Slug <span className="text-critical-text">*</span>
                  </label>
                  <p className="font-sans text-[11px] text-text-secondary">
                    Internal slug used for command dispatch and cooldown tracking (alphanumeric).
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={32}
                    placeholder="e.g. valorant"
                    value={newIdentifier}
                    onChange={(e) => setNewIdentifier(e.target.value)}
                    className="glass-input font-sans text-xs text-success-text"
                  />
                </div>

                {/* Custom Game Title */}
                <div className="space-y-1.5">
                  <label className="block font-sans text-xs text-text-primary">
                    Custom Game Title <span className="text-critical-text">*</span>
                  </label>
                  <p className="font-sans text-[11px] text-text-secondary">
                    Display title formatted in the public LFG announcement card.
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={64}
                    placeholder="e.g. Valorant Competitive"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    className="glass-input font-sans text-xs"
                  />
                </div>

                {/* Notification Role */}
                <div className="space-y-1.5">
                  <label className="block font-sans text-xs text-text-primary">
                    Notification Role <span className="text-critical-text">*</span>
                  </label>
                  <p className="font-sans text-[11px] text-text-secondary">
                    Discord role mentioned when players connect to the monitored room.
                  </p>
                  <RolePicker
                    roles={roles}
                    value={newRoleId}
                    onChange={setNewRoleId}
                    placeholder="select notification role..."
                  />
                </div>

                {/* Monitored Voice Channel */}
                <div className="space-y-1.5">
                  <label className="block font-sans text-xs text-text-primary">
                    Monitored Voice Room <span className="text-critical-text">*</span>
                  </label>
                  <p className="font-sans text-[11px] text-text-secondary">
                    Voice room that triggers the alert immediately upon member entry.
                  </p>
                  <ChannelPicker
                    channels={channels}
                    value={newVcId}
                    onChange={setNewVcId}
                    placeholder="select voice room..."
                    allowedTypes={[2, 13]}
                  />
                </div>

                {/* Cooldown Suppression */}
                <div className="space-y-1.5">
                  <label className="block font-sans text-xs text-text-primary">
                    Cooldown Suppression (seconds)
                  </label>
                  <p className="font-sans text-[11px] text-text-secondary">
                    Minimum interval before re-triggering this game ping (default 1200s = 20min).
                  </p>
                  <input
                    type="number"
                    min={60}
                    max={86400}
                    value={newCooldown}
                    onChange={(e) => setNewCooldown(e.target.value)}
                    className="glass-input font-sans text-xs w-36"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('triggers')}
                  className="btn-secondary text-xs"
                >
                  cancel
                </button>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="btn-primary flex items-center gap-2 text-xs"
                >
                  {isAdding ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{isAdding ? 'saving trigger...' : 'create trigger'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Routing Channel Configuration */}
      {activeTab === 'routing' && (
        <div className="surface-container">
          <div className="panel-header">
            <span className="text-success-text">routing &gt;</span>
            <span className="text-text-secondary">lfg announcement feed channel</span>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            <div className="max-w-xl space-y-1.5">
              <label className="block font-sans text-xs text-text-primary">
                Public Announcement Channel
              </label>
              <p className="font-sans text-[11px] text-text-secondary">
                The default text channel where Hawk dispatches game role mentions and interactive matchmaking cards.
              </p>
              <div className="pt-2">
                <ChannelPicker
                  channels={channels}
                  value={testChannelId}
                  onChange={handleSaveTestChannel}
                  placeholder="select announcement channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] font-sans text-[11px] text-text-muted flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>
                status: {testChannel ? `active dispatch to #${testChannel.name}` : 'unconfigured (no alerts will dispatch)'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

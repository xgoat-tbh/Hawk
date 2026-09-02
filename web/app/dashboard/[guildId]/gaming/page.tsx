'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SyncLoader } from '@/components/SyncLoader';
import { Gamepad2, Plus, Trash2, Clock, Volume2, Shield, Radio, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function GamingSettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [gamePings, setGamePings] = useState<any[]>([]);
  const [testChannelId, setTestChannelId] = useState<string | null>(null);

  // New Trigger Form State
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [newRoleId, setNewRoleId] = useState<string | null>(null);
  const [newVcId, setNewVcId] = useState<string | null>(null);
  const [newCooldown, setNewCooldown] = useState('1200');

  const [isAdding, setIsAdding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch(`/api/guilds/${guildId}`);
      const data = await res.json();
      setChannels(data.channels || []);
      setRoles(data.roles || []);
      setGamePings(data.config?.gamePings || []);
      setTestChannelId(data.config?.gameTestChannel || null);
    } catch (err) {
      console.error('Failed to load gaming config:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleAddTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentifier.trim() || !newGameName.trim() || !newRoleId || !newVcId) {
      setActionError('Please fill in all fields (identifier, name, role, voice channel).');
      return;
    }

    setIsAdding(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'gaming_add_ping',
          data: {
            identifier: newIdentifier.trim(),
            game_name: newGameName.trim(),
            role_id: newRoleId,
            vc_id: newVcId,
            cooldown_seconds: parseInt(newCooldown, 10) || 1200,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to create trigger');

      setNewIdentifier('');
      setNewGameName('');
      setNewRoleId(null);
      setNewVcId(null);
      setNewCooldown('1200');
      setActionSuccess('Gaming LFG trigger created successfully.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error creating trigger');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTrigger = async (identifier: string) => {
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'gaming_delete_ping',
          data: { identifier },
        }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to delete trigger:', err);
    }
  };

  const handleSaveTestChannel = async (channelId: string | null) => {
    setTestChannelId(channelId);
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'gaming_set_test_channel',
          data: { channel_id: channelId },
        }),
      });
    } catch (err) {
      console.error('Failed to save gaming test channel:', err);
    }
  };

  if (loading) {
    return <SyncLoader title="Loading Gaming LFG Settings" subtitle="Fetching gaming voice pings and notification channels..." />;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-white/80" />
            <span>Gaming LFG Alerts</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Voice activity alerts and role pings triggered when players join specific voice channels.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Global Notification Channel */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-xs text-white uppercase tracking-wider">Default LFG Notification Channel</h3>
            <p className="text-[11px] text-white/40">Text channel where gaming ping alerts are dispatched.</p>
          </div>
        </div>

        <div className="max-w-md pt-1">
          <ChannelSelect
            channels={channels}
            value={testChannelId}
            onChange={handleSaveTestChannel}
            placeholder="Select gaming notification channel..."
            allowedTypes={[0, 5]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Add Trigger Form (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Create LFG Alert</h3>
              <p className="text-[11px] text-white/40">Link a voice room to a game role and cooldown.</p>
            </div>
          </div>

          <form onSubmit={handleAddTrigger} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Unique Identifier (e.g. valorant)</label>
              <input
                type="text"
                required
                maxLength={32}
                value={newIdentifier}
                onChange={(e) => setNewIdentifier(e.target.value)}
                placeholder="valorant, apex, minecraft"
                className="glass-input font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Game Title</label>
              <input
                type="text"
                required
                maxLength={64}
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Valorant Competitive"
                className="glass-input font-sans text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Trigger Voice Channel</label>
              <ChannelSelect
                channels={channels}
                value={newVcId}
                onChange={setNewVcId}
                placeholder="Select voice room..."
                allowedTypes={[2, 13]}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Role to Ping</label>
              <RoleSelect
                roles={roles}
                value={newRoleId}
                onChange={setNewRoleId}
                placeholder="Select gamer role..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Cooldown Seconds</label>
              <input
                type="number"
                min={10}
                max={86400}
                value={newCooldown}
                onChange={(e) => setNewCooldown(e.target.value)}
                className="glass-input font-mono text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Create LFG Trigger</span>
            </button>
          </form>
        </div>

        {/* Right: Existing Triggers (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Active LFG Triggers ({gamePings.length})
            </span>
          </div>

          {gamePings.length === 0 ? (
            <div className="glass-card p-10 text-center text-xs text-white/30">
              No gaming LFG alerts configured. Use the form to link voice channels to role pings.
            </div>
          ) : (
            <div className="space-y-2.5">
              {gamePings.map((ping) => {
                const targetRole = roles.find((r) => r.id === ping.role_id);
                const targetVc = channels.find((c) => c.id === ping.vc_id);
                return (
                  <div
                    key={ping.identifier}
                    className="glass-card p-4 flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="w-3.5 h-3.5 text-white/60 shrink-0" />
                        <span className="font-medium text-xs text-white truncate">{ping.game_name}</span>
                        <span className="text-[10px] font-mono text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                          {ping.identifier}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/60 pt-0.5">
                        <div className="flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-white/40" />
                          <span>{targetVc?.name || 'Unknown VC'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-white/40" />
                          <span>@{targetRole?.name || 'Unknown Role'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-white/40" />
                          <span>{Math.round(ping.cooldown_seconds / 60)}m cooldown</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTrigger(ping.identifier)}
                      className="btn-outline-danger p-2 shrink-0"
                      title="Delete trigger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
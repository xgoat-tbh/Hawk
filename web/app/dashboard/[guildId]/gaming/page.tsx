'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SyncLoader } from '@/components/SyncLoader';
import { Gamepad2, Plus, Trash2, Clock, Volume2, Shield, Radio, CheckCircle2, AlertCircle } from 'lucide-react';

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
      setActionSuccess('Test broadcast channel updated.');
    } catch (err) {
      console.error('Failed to save test channel:', err);
    }
  };

  if (loading) {
    return <SyncLoader title="Syncing Gaming Voice Triggers" subtitle="Fetching active voice channels mapped to game roles and alert text channels..." />;
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <Gamepad2 className="w-6 h-6 text-[#5865F2]" />
          <span>Gaming Voice LFG Notifications</span>
        </h1>
        <p className="text-xs text-white/50 mt-1 font-medium">
          Automatically alert gamer roles in text channels when members hop into dedicated gaming voice channels.
        </p>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Test / Default Notification Channel */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">LFG Announcement & Test Channel</h3>
              <p className="text-xs text-white/40">Default text channel where gaming ping notifications and test alerts are sent.</p>
            </div>
          </div>
          <div className="max-w-md">
            <ChannelSelect
              channels={channels}
              value={testChannelId}
              onChange={handleSaveTestChannel}
              placeholder="Select default alert channel..."
            />
          </div>
        </div>

        {/* Add Trigger Card */}
        <form onSubmit={handleAddTrigger} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Add Gaming Ping Trigger</h3>
                <p className="text-xs text-white/40">Connect a dedicated voice room to a gamer mention role.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="btn-outline-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Adding...' : 'Add Trigger'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Identifier</label>
              <input
                type="text"
                value={newIdentifier}
                onChange={(e) => setNewIdentifier(e.target.value)}
                placeholder="e.g. au1, bgmi, bh1"
                className="glass-input font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Game Title</label>
              <input
                type="text"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="e.g. Among Us, BGMI"
                className="glass-input text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Mention Role</label>
              <RoleSelect
                roles={roles}
                value={newRoleId}
                onChange={setNewRoleId}
                placeholder="Select role..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Trigger Voice Channel</label>
              <ChannelSelect
                channels={channels}
                value={newVcId}
                onChange={setNewVcId}
                placeholder="Select VC..."
                allowedTypes={[2, 13]}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Cooldown (Sec)</label>
              <input
                type="number"
                value={newCooldown}
                onChange={(e) => setNewCooldown(e.target.value)}
                placeholder="1200"
                className="glass-input font-mono text-xs"
              />
            </div>
          </div>
        </form>

        {/* Existing Triggers List */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                Configured Gaming Voice Triggers ({gamePings.length})
              </h3>
              <p className="text-xs text-white/40">Active voice channels mapped to game roles and cooldown timers.</p>
            </div>
          </div>

          {gamePings.length === 0 ? (
            <div className="text-center py-12 text-xs text-white/30">
              No gaming triggers configured yet. Use the form above or Discord <code className="text-[#5865F2] font-mono">!gameset</code>.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {gamePings.map((ping) => {
                const targetRole = roles.find((r) => r.id === ping.role_id);
                const targetVc = channels.find((c) => c.id === ping.vc_id);

                return (
                  <div key={ping.identifier} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/30 text-[#7289da] font-mono font-bold text-xs">
                        {ping.identifier}
                      </span>
                      <span className="font-bold text-sm text-white">{ping.game_name}</span>
                      <span className="text-white/20">→</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-white/80 font-medium flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-violet-400" />
                        <span>@{targetRole ? targetRole.name : ping.role_id}</span>
                      </span>
                      <span className="text-white/20">→</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-white/80 font-medium flex items-center gap-1.5">
                        <Volume2 className="w-3 h-3 text-emerald-400" />
                        <span>{targetVc ? targetVc.name : ping.vc_id}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/40 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{ping.cooldown_seconds}s</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTrigger(ping.identifier)}
                      className="btn-outline-danger self-start sm:self-auto"
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
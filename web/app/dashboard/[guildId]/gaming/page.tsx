'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { useGuildData } from '@/context/GuildContext';
import { Gamepad2, Plus, Trash2, Volume2, Shield, Radio, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function GamingSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, roles, config, refreshData, updateConfigLocally } = useGuildData();

  const gamePings = config?.gamePings || [];
  const testChannelId = config?.gameTestChannel || null;

  // New Trigger Form State
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newGameName, setNewGameName] = useState('');
  const [newRoleId, setNewRoleId] = useState<string | null>(null);
  const [newVcId, setNewVcId] = useState<string | null>(null);
  const [newCooldown, setNewCooldown] = useState('1200');

  const [isAdding, setIsAdding] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
      setActionSuccess('Gaming LFG trigger created.');
      await refreshData();
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
      await refreshData();
    } catch (err) {
      console.error('Failed to delete trigger:', err);
    }
  };

  const handleSaveTestChannel = async (channelId: string | null) => {
    updateConfigLocally('gameTestChannel', channelId);
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

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-white/80" />
            <span>Gaming LFG Alerts</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Voice activity alerts and role pings triggered when players join specific voice rooms.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Global Routing Channel */}
      <div className="space-y-1">
        <SectionHeader
          title="Notification Routing"
          description="Default text channel where gaming pings are posted."
          icon={<Radio className="w-4 h-4" />}
        />

        <div className="pt-2">
          <SettingRow
            label="LFG Announcement Channel"
            description="Channel where bot pings game roles when voice activity starts."
          >
            <div className="w-64">
              <ChannelSelect
                channels={channels}
                value={testChannelId}
                onChange={handleSaveTestChannel}
                placeholder="Select notification channel..."
                allowedTypes={[0, 5]}
              />
            </div>
          </SettingRow>
        </div>
      </div>

      {/* Create Trigger Bar */}
      <form
        onSubmit={handleAddTrigger}
        className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
      >
        <div className="sm:col-span-2 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Identifier</label>
          <input
            type="text"
            required
            maxLength={32}
            placeholder="valorant"
            value={newIdentifier}
            onChange={(e) => setNewIdentifier(e.target.value)}
            className="glass-input font-mono text-xs"
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Game Title</label>
          <input
            type="text"
            required
            maxLength={64}
            placeholder="Valorant Competitive"
            value={newGameName}
            onChange={(e) => setNewGameName(e.target.value)}
            className="glass-input font-sans text-xs"
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Trigger Voice Room</label>
          <ChannelSelect
            channels={channels}
            value={newVcId}
            onChange={setNewVcId}
            placeholder="Select voice channel..."
            allowedTypes={[2, 13]}
          />
        </div>

        <div className="sm:col-span-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/40">Role to Ping</label>
          <RoleSelect
            roles={roles}
            value={newRoleId}
            onChange={setNewRoleId}
            placeholder="Select role..."
          />
        </div>

        <div className="sm:col-span-1">
          <button
            type="submit"
            disabled={isAdding}
            className="btn-primary w-full py-2 flex items-center justify-center text-xs shrink-0"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </form>

      {/* Gaming Triggers Data Table (with Independent Internal Scroll) */}
      <div className="space-y-2">
        <SectionHeader
          title={`Active LFG Triggers (${gamePings.length})`}
          description="Monitored voice channels and linked gamer ping alerts."
        />

        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#08080a]">
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#0d0d10] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-3 px-4">Game & Identifier</th>
                  <th className="py-3 px-4">Voice Channel</th>
                  <th className="py-3 px-4">Pinged Role</th>
                  <th className="py-3 px-4">Cooldown</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {gamePings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/30 text-xs">
                      No gaming triggers configured yet. Use the form above to link a voice channel to a game role.
                    </td>
                  </tr>
                ) : (
                  gamePings.map((ping: any) => {
                    const targetRole = roles.find((r) => r.id === ping.role_id);
                    const targetVc = channels.find((c) => c.id === ping.vc_id);
                    return (
                      <tr key={ping.identifier} className="hover:bg-white/[0.015] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{ping.game_name}</div>
                          <div className="text-[10px] font-mono text-white/30">ID: {ping.identifier}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-white/80">
                            <Volume2 className="w-3.5 h-3.5 text-white/40" />
                            <span>{targetVc?.name || `VC ${ping.vc_id}`}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] text-white/80 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                            <Shield className="w-3 h-3 text-white/40" />
                            <span>@{targetRole?.name || `Role ${ping.role_id}`}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-white/50">
                          {Math.round(ping.cooldown_seconds / 60)}m
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTrigger(ping.identifier)}
                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors"
                            title="Delete trigger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
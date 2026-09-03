'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RolePicker } from '@/components/ui/RolePicker';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { Gamepad2, Plus, Trash2, Volume2, Shield, Radio, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function GamingSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, roles, config, refreshData, updateConfigLocally, loading } = useGuildData();
  const containerRef = usePageEntrance(!loading);

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
      setTimeout(() => setActionSuccess(null), 4000);
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
      setActionSuccess('Gaming LFG trigger removed.');
      setTimeout(() => setActionSuccess(null), 4000);
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
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17191c] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#ededed] tracking-tight flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-[#949aa2]" />
            <span>Gaming LFG Alerts</span>
          </h1>
          <p className="text-xs text-[#6e747c] mt-0.5">
            Voice activity alerts and role pings triggered when players join specific voice rooms.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-success-soft border border-success-border flex items-center gap-2 text-xs text-success-text">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-lg bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 text-critical shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Global Routing Channel */}
      <div className="space-y-1" data-animate-section>
        <SectionHeader
          title="Notification Routing"
          description="Default text channel where gaming pings are posted."
          icon={<Radio className="w-3.5 h-3.5 text-[#6e747c]" />}
        />

        <div className="pt-2">
          <SettingRow
            label="LFG Announcement Channel"
            description="Channel where bot pings game roles when voice activity starts."
          >
            <div className="w-64">
              <ChannelPicker
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
        className="p-4 sm:p-5 rounded-lg bg-[#0d0e10] border border-[#1f2226] space-y-4 shadow-sm"
        data-animate-section
      >
        <SectionHeader
          title="Create Gaming Trigger"
          description="Designate a voice room, game title, and ping role."
          icon={<Plus className="w-3.5 h-3.5 text-[#6e747c]" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-[#ededed]">Identifier</label>
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
            <label className="text-xs font-medium text-[#ededed]">Game Title</label>
            <input
              type="text"
              required
              maxLength={64}
              placeholder="Valorant Ranked"
              value={newGameName}
              onChange={(e) => setNewGameName(e.target.value)}
              className="glass-input text-xs"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-xs font-medium text-[#ededed]">Ping Role</label>
            <RolePicker
              roles={roles}
              value={newRoleId}
              onChange={setNewRoleId}
              placeholder="Select ping role..."
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-[#ededed]">Voice Room</label>
            <ChannelPicker
              channels={channels}
              value={newVcId}
              onChange={setNewVcId}
              placeholder="Select room..."
              allowedTypes={[2, 13]}
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isAdding}
              className="btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1.5"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Trigger</span>
            </button>
          </div>
        </div>
      </form>

      {/* Existing Triggers Table */}
      <div className="space-y-3" data-animate-section>
        <SectionHeader
          title={`Active Gaming Triggers (${gamePings.length})`}
          description="When members connect to these voice rooms, Hawk pings the associated role."
        />

        <div className="border border-[#1f2226] rounded-lg overflow-hidden bg-[#0d0e10] shadow-sm">
          <HawkScrollArea maxHeight="420px">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#17191c] text-[10px] font-mono uppercase tracking-wider text-[#6e747c]">
                <tr>
                  <th className="py-2.5 px-4">Identifier</th>
                  <th className="py-2.5 px-4">Game</th>
                  <th className="py-2.5 px-4">Voice Channel</th>
                  <th className="py-2.5 px-4">Role Pinged</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17191c]">
                {gamePings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#6e747c] text-xs">
                      No gaming triggers configured. Set up a trigger above.
                    </td>
                  </tr>
                ) : (
                  gamePings.map((ping: any) => {
                    const role = roles.find((r) => r.id === ping.role_id);
                    const vc = channels.find((c) => c.id === ping.vc_id);

                    return (
                      <tr key={ping.identifier} className="hover:bg-[#121417]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-[#ededed]">
                          {ping.identifier}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#ededed]">
                          {ping.game_name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#ededed]">
                            <Volume2 className="w-3.5 h-3.5 text-[#6e747c]" />
                            <span>{vc ? vc.name : ping.vc_id}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#121417] border border-[#1f2226]">
                            <Shield className="w-3 h-3 text-[#949aa2]" />
                            <span>@{role ? role.name : ping.role_id}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTrigger(ping.identifier)}
                            className="p-1 rounded text-[#6e747c] hover:text-critical-text hover:bg-critical-soft transition-colors"
                            title="Delete Trigger"
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
          </HawkScrollArea>
        </div>
      </div>
    </div>
  );
}
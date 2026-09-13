'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { RolePicker } from '@/components/ui/RolePicker';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SettingRow } from '@/components/ui/SettingRow';
import { StatCard } from '@/components/ui/StatCard';
import { useGuildData } from '@/context/GuildContext';
import {
  Gamepad2,
  Plus,
  Trash2,
  Volume2,
  Shield,
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
} from 'lucide-react';

export default function GamingSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, roles, config, refreshData, updateConfigLocally } = useGuildData();

  const [activeTab, setActiveTab] = useState<'triggers' | 'create' | 'feed'>('triggers');

  const gamePings = config?.gamePings || [];
  const testChannelId = config?.gameTestChannel || null;
  const testChannel = channels.find((c) => c.id === testChannelId);

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
      setActionError('Please fill in all required fields (identifier, name, role, voice channel).');
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
      setActiveTab('triggers');
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
      setActionSuccess('LFG announcement channel updated.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save gaming test channel:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#101217] dark:text-[#f0f2f5] flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Gaming LFG Alerts & Activity Pings
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#8c949e]">
            Automated voice activity alerts and role pings triggered when players enter specific game voice channels.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('create')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add LFG Trigger
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Triggers"
          value={gamePings.length}
          subtitle="Monitored voice rooms"
          icon={Gamepad2}
        />
        <StatCard
          title="Announcement Feed"
          value={testChannel ? `#${testChannel.name}` : 'Unconfigured'}
          subtitle="LFG ping dispatch channel"
          icon={Radio}
        />
        <StatCard
          title="Anti-Spam Cooldown"
          value="20 min"
          subtitle="Default suppression interval"
          icon={Clock}
        />
        <StatCard
          title="Voice Monitoring"
          value="Real-time"
          subtitle="Instant gateway state detection"
          icon={Zap}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08] dark:border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('triggers')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'triggers'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          Active Triggers ({gamePings.length})
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'create'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Plus className="w-4 h-4" />
          Create Trigger
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'feed'
              ? 'border-indigo-500 text-indigo-600 dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#717882] dark:hover:text-[#c1c7cd]'
          }`}
        >
          <Radio className="w-4 h-4" />
          Announcement Channel
        </button>
      </div>

      {/* TAB 1: Triggers List */}
      {activeTab === 'triggers' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Monitored Voice Triggers"
            description="When members connect to these voice rooms, Amo Bot automatically pings the associated game role in the designated channel."
          />

          {gamePings.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-[#717882]">
              <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-[#101217] dark:text-white">No gaming triggers configured</p>
              <p className="mt-1">Create a trigger above to ping player roles when voice activity starts.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.06] dark:divide-[#1a1d24] border border-black/[0.08] dark:border-[#1a1d24] rounded-lg overflow-hidden bg-slate-50/50 dark:bg-[#121418]">
              {gamePings.map((ping: any) => {
                const role = roles.find((r) => r.id === ping.role_id);
                const vc = channels.find((c) => c.id === ping.vc_id);

                return (
                  <div key={ping.identifier} className="flex items-center justify-between p-4 hover:bg-slate-100/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#101217] dark:text-white">{ping.game_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-[#16181d] border border-black/[0.08] dark:border-[#262a33] text-indigo-600 dark:text-indigo-400">
                            {ping.identifier}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-[#8c949e]">
                          <span className="flex items-center gap-1">
                            <Volume2 className="w-3 h-3 text-slate-400 dark:text-[#717882]" />
                            {vc ? vc.name : ping.vc_id}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-slate-400 dark:text-[#717882]" />
                            <code className="text-indigo-600 dark:text-indigo-400">@{role ? role.name : ping.role_id}</code>
                          </span>
                          <span>•</span>
                          <span>{ping.cooldown_seconds || 1200}s cooldown</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTrigger(ping.identifier)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors"
                      title="Delete Trigger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Create Trigger */}
      {activeTab === 'create' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Configure Gaming LFG Trigger"
            description="Link a Discord voice room to a game title and notification role."
          />

          <form onSubmit={handleAddTrigger} className="space-y-4">
            <SettingRow
              label="System Identifier"
              description="Internal slug used for command queries and cooldown tracking."
            >
              <input
                type="text"
                required
                maxLength={32}
                placeholder="e.g. valorant"
                value={newIdentifier}
                onChange={(e) => setNewIdentifier(e.target.value)}
                className="w-72 bg-[#f8f9fa] dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] rounded-lg px-3 py-1.5 text-xs text-[#101217] dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </SettingRow>

            <SettingRow
              label="Game Title"
              description="Human-friendly game name displayed in the LFG alert announcement."
            >
              <input
                type="text"
                required
                maxLength={64}
                placeholder="e.g. Valorant Competitive"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                className="w-72 bg-[#f8f9fa] dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] rounded-lg px-3 py-1.5 text-xs text-[#101217] dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </SettingRow>

            <SettingRow
              label="Notification Role"
              description="The role to mention when members connect to the monitored room."
            >
              <div className="w-72">
                <RolePicker
                  roles={roles}
                  value={newRoleId}
                  onChange={setNewRoleId}
                  placeholder="Select ping role..."
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Monitored Voice Room"
              description="Voice channel that triggers the alert when a user joins."
            >
              <div className="w-72">
                <ChannelPicker
                  channels={channels}
                  value={newVcId}
                  onChange={setNewVcId}
                  placeholder="Select voice room..."
                  allowedTypes={[2, 13]}
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Cooldown Suppression (seconds)"
              description="Minimum seconds before the bot will ping this role again (default 1200s = 20min)."
            >
              <input
                type="number"
                min={60}
                max={86400}
                value={newCooldown}
                onChange={(e) => setNewCooldown(e.target.value)}
                className="w-32 bg-[#f8f9fa] dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] rounded-lg px-3 py-1.5 text-xs text-[#101217] dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </SettingRow>

            <div className="pt-3 border-t border-black/[0.08] dark:border-[#1a1d24] flex justify-end">
              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors disabled:opacity-40 shadow-xs"
              >
                {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isAdding ? 'Creating...' : 'Create Trigger'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Feed Channel */}
      {activeTab === 'feed' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Global Notification Routing"
            description="Default text channel where gaming LFG pings and player activity alerts are posted."
          />

          <SettingRow
            label="LFG Announcement Channel"
            description="The public channel where bot pings game roles when voice activity starts."
            badge={testChannel ? 'Active' : 'Unset'}
            badgeVariant={testChannel ? 'success' : 'neutral'}
          >
            <div className="w-72">
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
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SyncLoader } from '@/components/SyncLoader';
import { ShieldAlert, Plus, Trash2, Shield, Lock, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PermissionsSettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [permits, setPermits] = useState<any[]>([]);
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [ignoredEntities, setIgnoredEntities] = useState<any[]>([]);

  // Add Permit State
  const [permitRoleId, setPermitRoleId] = useState<string | null>(null);
  const [permitCommand, setPermitCommand] = useState('');

  // Add Ignore State
  const [ignoreChannelId, setIgnoreChannelId] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch(`/api/guilds/${guildId}`);
      const data = await res.json();
      setChannels(data.channels || []);
      setRoles(data.roles || []);
      setPermits(data.config?.permits || []);
      setRestrictions(data.config?.restrictions || []);
      setIgnoredEntities(data.config?.ignoredEntities || []);
    } catch (err) {
      console.error('Failed to load permissions config:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleAddPermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitRoleId) {
      setActionError('Please select a target role to grant command permit.');
      return;
    }

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'permit_add',
          data: {
            target_type: 'role',
            target_id: permitRoleId,
            command_name: permitCommand.trim() ? permitCommand.trim().toLowerCase() : null,
            module_name: null,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to create permit');

      setPermitRoleId(null);
      setPermitCommand('');
      setActionSuccess('Custom command permit granted.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error creating permit');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePermit = async (id: number) => {
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'permit_delete',
          data: { id },
        }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to delete permit:', err);
    }
  };

  const handleAddIgnoreChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ignoreChannelId) {
      setActionError('Please select a channel to ignore.');
      return;
    }

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'ignore_add',
          data: {
            entity_type: 'channel',
            entity_id: ignoreChannelId,
            scope_type: null,
            scope_id: null,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to ignore channel');

      setIgnoreChannelId(null);
      setActionSuccess('Bot will ignore triggers in this channel.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error adding ignore rule');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteIgnore = async (id: number) => {
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'ignore_delete',
          data: { id },
        }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to delete ignore rule:', err);
    }
  };

  if (loading) {
    return <SyncLoader title="Syncing Security & Permissions" subtitle="Fetching command permit ACLs, channel restrictions, and ignore lists..." />;
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <ShieldAlert className="w-6 h-6 text-[#5865F2]" />
          <span>Permissions, Restrict & Ignore Rules</span>
        </h1>
        <p className="text-xs text-white/50 mt-1 font-medium">
          Fine-tune command execution permissions, restrict commands to specific channels, and whitelist/blacklist bot responses.
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
        {/* Custom Permits */}
        <form onSubmit={handleAddPermit} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Grant Command Permit</h3>
                <p className="text-xs text-white/40">Allow non-admin roles to execute specific bot commands.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="btn-outline-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Granting...' : 'Grant Permit'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Target Role</label>
              <RoleSelect
                roles={roles}
                value={permitRoleId}
                onChange={setPermitRoleId}
                placeholder="Select role to permit..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Command Name (Optional)</label>
              <input
                type="text"
                value={permitCommand}
                onChange={(e) => setPermitCommand(e.target.value)}
                placeholder="e.g. purge, mute, lock (leave blank for all)"
                className="glass-input text-xs font-mono"
              />
            </div>
          </div>
        </form>

        {/* Existing Permits */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                Configured Custom Permits ({permits.length})
              </h3>
              <p className="text-xs text-white/40">Role overrides for administrative bot actions.</p>
            </div>
          </div>

          {permits.length === 0 ? (
            <div className="text-center py-12 text-xs text-white/30">
              No custom permits configured. Only server admins and bot commanders have full access.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {permits.map((item) => {
                const targetRole = roles.find((r) => r.id === item.target_id);
                return (
                  <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-300 font-semibold text-xs flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>@{targetRole ? targetRole.name : item.target_id}</span>
                      </span>
                      <span className="text-white/20">→</span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-white/80">
                        {item.command_name ? `!${item.command_name}` : 'All Commands'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePermit(item.id)}
                      className="btn-outline-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ignored Channels Form */}
        <form onSubmit={handleAddIgnoreChannel} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Ignore Channel Triggers</h3>
                <p className="text-xs text-white/40">Completely silence the bot from responding to commands in selected channels.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="btn-outline-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Adding...' : 'Ignore Channel'}</span>
            </button>
          </div>

          <div className="max-w-md space-y-2 pt-2">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Channel to Ignore</label>
            <ChannelSelect
              channels={channels}
              value={ignoreChannelId}
              onChange={setIgnoreChannelId}
              placeholder="Select channel..."
              allowedTypes={[0, 2, 5]}
            />
          </div>
        </form>

        {/* Existing Ignored Entities */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                Ignored Channels & Entities ({ignoredEntities.length})
              </h3>
              <p className="text-xs text-white/40">Hawk bot ignores all commands in these scopes.</p>
            </div>
          </div>

          {ignoredEntities.length === 0 ? (
            <div className="text-center py-12 text-xs text-white/30">
              No channels ignored. The bot responds across all enabled server channels.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {ignoredEntities.map((item) => {
                const targetChannel = channels.find((c) => c.id === item.entity_id);
                return (
                  <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 font-semibold text-xs flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>{targetChannel ? `#${targetChannel.name}` : item.entity_id}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteIgnore(item.id)}
                      className="btn-outline-danger"
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
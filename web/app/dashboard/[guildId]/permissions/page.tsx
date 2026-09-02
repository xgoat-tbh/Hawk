'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RoleSelect } from '@/components/RoleSelect';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SyncLoader } from '@/components/SyncLoader';
import { ShieldAlert, Plus, Trash2, Shield, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function PermissionsSettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [permits, setPermits] = useState<any[]>([]);
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

  const handleAddIgnore = async (e: React.FormEvent) => {
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
      setActionSuccess('Channel added to bot ignore list.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Error ignoring channel');
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
    return <SyncLoader title="Loading Permissions & Access Rules" subtitle="Fetching command permit overrides, channel restrictions, and ignore lists..." />;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-white/80" />
            <span>Permissions & Access Control</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Fine-grained command permits, channel ignore rules, and execution boundaries.
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

      {/* Section 1: Command Permits */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-white/50">
          1. Custom Command Permits (ACL Overrides)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add Permit Form (5 cols) */}
          <div className="lg:col-span-5 glass-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-medium text-xs text-white uppercase tracking-wider">Grant Command Permit</h3>
                <p className="text-[11px] text-white/40">Grant a role permission to use a specific command.</p>
              </div>
            </div>

            <form onSubmit={handleAddPermit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Target Role</label>
                <RoleSelect
                  roles={roles}
                  value={permitRoleId}
                  onChange={setPermitRoleId}
                  placeholder="Select role..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Command Name (Leave blank for all)</label>
                <input
                  type="text"
                  maxLength={32}
                  value={permitCommand}
                  onChange={(e) => setPermitCommand(e.target.value)}
                  placeholder="e.g. nuke, purge, lock"
                  className="glass-input font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Grant Permit</span>
              </button>
            </form>
          </div>

          {/* Active Permits List (7 cols) */}
          <div className="lg:col-span-7 space-y-2.5">
            {permits.length === 0 ? (
              <div className="glass-card p-8 text-center text-xs text-white/30">
                No custom permits configured. Only server Administrators and Bot Commanders have elevated access.
              </div>
            ) : (
              permits.map((permit) => {
                const targetRole = roles.find((r) => r.id === permit.target_id);
                return (
                  <div
                    key={permit.id}
                    className="glass-card p-4 flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-white/60 shrink-0" />
                        <span className="font-medium text-xs text-white truncate">
                          @{targetRole?.name || `Role ${permit.target_id}`}
                        </span>
                        <span className="text-[10px] font-mono text-white/80 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded">
                          {permit.command_name ? `!${permit.command_name}` : 'All Commands'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePermit(permit.id)}
                      className="btn-outline-danger p-2 shrink-0"
                      title="Revoke permit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Ignored Channels */}
      <div className="space-y-3 pt-4 border-t border-white/[0.06]">
        <h2 className="text-xs font-mono uppercase tracking-wider text-white/50">
          2. Ignored Channels (Bot Inactive Zones)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add Ignore Form (5 cols) */}
          <div className="lg:col-span-5 glass-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                <EyeOff className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-medium text-xs text-white uppercase tracking-wider">Ignore Channel</h3>
                <p className="text-[11px] text-white/40">Bot will ignore prefix commands sent in this channel.</p>
              </div>
            </div>

            <form onSubmit={handleAddIgnore} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Target Channel</label>
                <ChannelSelect
                  channels={channels}
                  value={ignoreChannelId}
                  onChange={setIgnoreChannelId}
                  placeholder="Select channel to ignore..."
                  allowedTypes={[0, 5]}
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Channel to Ignore List</span>
              </button>
            </form>
          </div>

          {/* Active Ignores List (7 cols) */}
          <div className="lg:col-span-7 space-y-2.5">
            {ignoredEntities.length === 0 ? (
              <div className="glass-card p-8 text-center text-xs text-white/30">
                No channels ignored. The bot responds to commands across all channels.
              </div>
            ) : (
              ignoredEntities.map((item) => {
                const targetChannel = channels.find((c) => c.id === item.entity_id);
                return (
                  <div
                    key={item.id}
                    className="glass-card p-4 flex items-center justify-between gap-4 group"
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-3.5 h-3.5 text-white/50 shrink-0" />
                        <span className="font-medium text-xs text-white truncate">
                          #{targetChannel?.name || `Channel ${item.entity_id}`}
                        </span>
                        <span className="text-[10px] font-mono text-white/40 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded">
                          Ignored
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteIgnore(item.id)}
                      className="btn-outline-danger p-2 shrink-0"
                      title="Remove ignore rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
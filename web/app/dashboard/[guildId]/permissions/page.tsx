'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { RoleSelect } from '@/components/RoleSelect';
import { useGuildData } from '@/context/GuildContext';
import { Lock, Plus, Trash2, Shield, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function PermissionsSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, roles, config, refreshData } = useGuildData();

  const permits = config?.permits || [];
  const ignored = config?.ignoredEntities || [];

  // Permit Form
  const [permitCommand, setPermitCommand] = useState('');
  const [permitRoleId, setPermitRoleId] = useState<string | null>(null);
  const [isAddingPermit, setIsAddingPermit] = useState(false);

  // Ignore Form
  const [ignoreType, setIgnoreType] = useState<'channel' | 'role'>('channel');
  const [ignoreChannelId, setIgnoreChannelId] = useState<string | null>(null);
  const [ignoreRoleId, setIgnoreRoleId] = useState<string | null>(null);
  const [isAddingIgnore, setIsAddingIgnore] = useState(false);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAddPermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permitCommand.trim() || !permitRoleId) {
      setActionError('Please specify command name and role for permit.');
      return;
    }

    setIsAddingPermit(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'permit_add',
          data: {
            command_name: permitCommand.trim().toLowerCase(),
            role_id: permitRoleId,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to grant permit');

      setPermitCommand('');
      setPermitRoleId(null);
      setActionSuccess('Command permit granted.');
      await refreshData();
    } catch (err: any) {
      setActionError(err.message || 'Error granting permit');
    } finally {
      setIsAddingPermit(false);
    }
  };

  const handleDeletePermit = async (commandName: string, roleId: string) => {
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'permit_delete',
          data: { command_name: commandName, role_id: roleId },
        }),
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to delete permit:', err);
    }
  };

  const handleAddIgnore = async (e: React.FormEvent) => {
    e.preventDefault();
    const entityId = ignoreType === 'channel' ? ignoreChannelId : ignoreRoleId;
    if (!entityId) {
      setActionError(`Please select a ${ignoreType} to ignore.`);
      return;
    }

    setIsAddingIgnore(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'ignore_add',
          data: {
            entity_type: ignoreType,
            entity_id: entityId,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to add ignore rule');

      setIgnoreChannelId(null);
      setIgnoreRoleId(null);
      setActionSuccess(`${ignoreType === 'channel' ? 'Channel' : 'Role'} added to bot ignore list.`);
      await refreshData();
    } catch (err: any) {
      setActionError(err.message || 'Error adding ignore rule');
    } finally {
      setIsAddingIgnore(false);
    }
  };

  const handleDeleteIgnore = async (entityType: string, entityId: string) => {
    try {
      await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'ignore_delete',
          data: { entity_type: entityType, entity_id: entityId },
        }),
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to remove ignore rule:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-4 h-4 text-white/80" />
            <span>Permissions & Ignore Rules</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Configure granular command permit overrides and global channel/role ignore rules.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Command Permits */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-medium text-xs text-white uppercase tracking-wider">Grant Command Permit</h3>
                <p className="text-[11px] text-white/40">Allow specific roles to execute protected commands.</p>
              </div>
            </div>

            <form onSubmit={handleAddPermit} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Command Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ban, kick, clear, additem"
                  value={permitCommand}
                  onChange={(e) => setPermitCommand(e.target.value)}
                  className="glass-input font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Authorized Role</label>
                <RoleSelect
                  roles={roles}
                  value={permitRoleId}
                  onChange={setPermitRoleId}
                  placeholder="Select authorized role..."
                />
              </div>

              <button
                type="submit"
                disabled={isAddingPermit}
                className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
              >
                {isAddingPermit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Grant Permit</span>
              </button>
            </form>
          </div>

          {/* Active Permits List */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Active Command Permits ({permits.length})
            </span>

            {permits.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-white/30">
                No custom command permits configured.
              </div>
            ) : (
              <div className="space-y-2">
                {permits.map((p: any) => {
                  const targetRole = roles.find((r) => r.id === p.role_id);
                  return (
                    <div
                      key={`${p.command_name}-${p.role_id}`}
                      className="glass-card p-3.5 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono text-xs text-white bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                          !{p.command_name}
                        </span>
                        <span className="text-xs text-white/60 truncate">
                          @{targetRole?.name || `Role ${p.role_id}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePermit(p.command_name, p.role_id)}
                        className="btn-outline-danger p-1.5 shrink-0"
                        title="Revoke permit"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Ignored Entities */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                <EyeOff className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-medium text-xs text-white uppercase tracking-wider">Add Ignore Rule</h3>
                <p className="text-[11px] text-white/40">Completely silence the bot in specific channels or for roles.</p>
              </div>
            </div>

            <form onSubmit={handleAddIgnore} className="space-y-3 pt-1">
              <div className="flex items-center gap-2 bg-[#050507] p-1 rounded-lg border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIgnoreType('channel')}
                  className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                    ignoreType === 'channel' ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Ignore Channel
                </button>
                <button
                  type="button"
                  onClick={() => setIgnoreType('role')}
                  className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                    ignoreType === 'role' ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Ignore Role
                </button>
              </div>

              {ignoreType === 'channel' ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Channel to Ignore</label>
                  <ChannelSelect
                    channels={channels}
                    value={ignoreChannelId}
                    onChange={setIgnoreChannelId}
                    placeholder="Select text channel..."
                    allowedTypes={[0, 5]}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Role to Ignore</label>
                  <RoleSelect
                    roles={roles}
                    value={ignoreRoleId}
                    onChange={setIgnoreRoleId}
                    placeholder="Select role to silence..."
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isAddingIgnore}
                className="btn-primary w-full py-2 flex items-center justify-center gap-2 mt-2"
              >
                {isAddingIgnore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add to Ignore List</span>
              </button>
            </form>
          </div>

          {/* Active Ignore Rules List */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Active Ignore Rules ({ignored.length})
            </span>

            {ignored.length === 0 ? (
              <div className="glass-card p-6 text-center text-xs text-white/30">
                No channels or roles are currently ignored.
              </div>
            ) : (
              <div className="space-y-2">
                {ignored.map((item: any) => {
                  const targetChannel = channels.find((c) => c.id === item.entity_id);
                  const targetRole = roles.find((r) => r.id === item.entity_id);
                  return (
                    <div
                      key={`${item.entity_type}-${item.entity_id}`}
                      className="glass-card p-3.5 flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                          {item.entity_type}
                        </span>
                        <span className="text-xs text-white truncate">
                          {item.entity_type === 'channel'
                            ? `#${targetChannel?.name || `Channel ${item.entity_id}`}`
                            : `@${targetRole?.name || `Role ${item.entity_id}`}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteIgnore(item.entity_type, item.entity_id)}
                        className="btn-outline-danger p-1.5 shrink-0"
                        title="Remove ignore rule"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
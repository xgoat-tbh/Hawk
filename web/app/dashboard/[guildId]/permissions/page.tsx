'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import { PermissionMatrix } from '@/components/Permissions/PermissionMatrix';
import { CommandAclDrawer } from '@/components/Permissions/CommandAclDrawer';
import { RolePoliciesTable } from '@/components/Permissions/RolePoliciesTable';
import { UserOverridesList } from '@/components/Permissions/UserOverridesList';
import { AccessPreviewer } from '@/components/Permissions/AccessPreviewer';
import { AuditLogTable } from '@/components/Permissions/AuditLogTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Shield,
  Lock,
  Command,
  Users,
  User,
  History,
  Eye,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  PermissionProfile,
  RolePolicy,
  UserOverride,
  CommandAcl,
  DEFAULT_PRESET_PROFILES,
} from '@/lib/permissions';

export default function PermissionsMasterPage() {
  const { guildId } = useParams() as { guildId: string };
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'access';

  const { roles } = useGuildData();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [profiles, setProfiles] = useState<PermissionProfile[]>(DEFAULT_PRESET_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('administrator');
  const [rolePolicies, setRolePolicies] = useState<RolePolicy[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserOverride[]>([]);
  const [commandAcls, setCommandAcls] = useState<CommandAcl[]>([]);
  const [selectedCommandForAcl, setSelectedCommandForAcl] = useState<CommandAcl | null>(null);

  const [commandSearch, setCommandSearch] = useState('');
  const [commandFilter, setCommandFilter] = useState<'ALL' | 'OVERRIDDEN' | 'CRITICAL'>('ALL');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch live permissions bundle
  useEffect(() => {
    async function loadPermissions() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/permissions`);
        if (res.ok) {
          const data = await res.json();
          if (data.profiles) setProfiles(data.profiles);
          if (data.rolePolicies) setRolePolicies(data.rolePolicies);
          if (data.userOverrides) setUserOverrides(data.userOverrides);
          if (data.commandAcls) setCommandAcls(data.commandAcls);
        }
      } catch (err) {
        console.error('Failed to load permissions:', err);
      }
    }
    loadPermissions();
  }, [guildId]);

  const handleSaveProfiles = async (updatedProfiles: PermissionProfile[]) => {
    try {
      setProfiles(updatedProfiles);
      await fetch(`/api/guilds/${guildId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_profiles', data: { profiles: updatedProfiles } }),
      });
      setStatusMessage('Access profiles saved successfully.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving profiles');
    }
  };

  const handleSaveRolePolicies = async (updated: RolePolicy[]) => {
    try {
      setRolePolicies(updated);
      await fetch(`/api/guilds/${guildId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_role_policies', data: { rolePolicies: updated } }),
      });
      setStatusMessage('Role policies updated.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating role policies');
    }
  };

  const handleSaveUserOverrides = async (updated: UserOverride[]) => {
    try {
      setUserOverrides(updated);
      await fetch(`/api/guilds/${guildId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_user_overrides', data: { userOverrides: updated } }),
      });
      setStatusMessage('User overrides updated.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating user overrides');
    }
  };

  const handleSaveCommandAcl = async (updated: CommandAcl) => {
    try {
      await fetch(`/api/guilds/${guildId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_command_acl',
          data: {
            command: updated.command,
            roleOverrides: updated.roleOverrides,
            userOverrides: updated.userOverrides,
          },
        }),
      });
      setCommandAcls((prev) =>
        prev.map((c) => (c.command === updated.command ? updated : c))
      );
      setStatusMessage(`Command permit updated for !${updated.command}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating command ACL');
    }
  };

  const activeProfile =
    profiles.find((p) => p.id === selectedProfileId) || profiles[0] || DEFAULT_PRESET_PROFILES[0];

  const filteredCommands = commandAcls.filter((c) => {
    const matchesSearch =
      c.command.toLowerCase().includes(commandSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(commandSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (commandFilter === 'OVERRIDDEN') {
      return (c.roleOverrides?.length || 0) > 0 || (c.userOverrides?.length || 0) > 0;
    }
    if (commandFilter === 'CRITICAL') {
      return c.dangerLevel === 'CRITICAL' || c.dangerLevel === 'HIGH';
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-4 h-4 text-white/80" />
            <span>Permissions & Access Rules</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Configure dashboard access profiles, Discord command ACL overrides, role policies, and audit logs.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-white/[0.08] overflow-x-auto pb-px">
        {[
          { id: 'access', label: 'Dashboard Access', icon: Shield },
          { id: 'commands', label: 'Command Permissions', icon: Command },
          { id: 'roles', label: 'Role Policies', icon: Users },
          { id: 'users', label: 'User Overrides', icon: User },
          { id: 'preview', label: 'Access Preview', icon: Eye },
          { id: 'audit', label: 'Audit Log', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-white/40'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Dashboard Access & Permission Matrix */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Profiles List (4 cols) */}
            <div className="lg:col-span-4 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                Permission Profiles ({profiles.length})
              </span>

              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedProfileId === p.id
                        ? 'bg-white/[0.08] border-white/30 text-white shadow-sm'
                        : 'bg-[#08080a] border-white/[0.06] text-white/70 hover:border-white/20 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">{p.name}</span>
                      {p.isPreset && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.04] text-white/40 border border-white/[0.06]">
                          Preset
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Matrix View (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="p-4 rounded-xl bg-[#08080a] border border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">{activeProfile.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{activeProfile.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={activeProfile.isPreset ? 'Preset Profile' : 'Custom'} variant="info" />
                </div>
              </div>

              <PermissionMatrix
                profile={activeProfile}
                onChange={(updated) => {
                  const updatedProfiles = profiles.map((p) => (p.id === updated.id ? updated : p));
                  handleSaveProfiles(updatedProfiles);
                }}
                disabled={activeProfile.id === 'administrator'}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Command Permissions & ACLs */}
      {activeTab === 'commands' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#08080a] border border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search commands or descriptions..."
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                className="glass-input pl-8 text-xs font-sans"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={commandFilter}
                onChange={(e) => setCommandFilter(e.target.value as any)}
                className="glass-input text-xs font-sans w-36"
              >
                <option value="ALL" className="bg-[#0a0a0c] text-white">All Commands</option>
                <option value="OVERRIDDEN" className="bg-[#0a0a0c] text-white">Has Overrides</option>
                <option value="CRITICAL" className="bg-[#0a0a0c] text-white">High/Critical Risk</option>
              </select>
            </div>
          </div>

          {/* Commands Table (Internal Scroll) */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#08080a]">
            <div className="max-h-[55vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#0d0d10] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-white/40">
                  <tr>
                    <th className="py-3 px-4">Command</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Default Profile</th>
                    <th className="py-3 px-4">Overrides</th>
                    <th className="py-3 px-4 text-right">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredCommands.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-white/30 text-xs">
                        No commands matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCommands.map((cmd) => {
                      const overrideCount = (cmd.roleOverrides?.length || 0) + (cmd.userOverrides?.length || 0);
                      return (
                        <tr
                          key={cmd.command}
                          onClick={() => setSelectedCommandForAcl(cmd)}
                          className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-medium text-white">
                            !{cmd.command}
                          </td>
                          <td className="py-3 px-4 text-white/60 capitalize">
                            {cmd.category}
                          </td>
                          <td className="py-3 px-4 text-white/80 capitalize">
                            {cmd.defaultRoleProfile}
                          </td>
                          <td className="py-3 px-4">
                            {overrideCount > 0 ? (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                {overrideCount} custom {overrideCount === 1 ? 'override' : 'overrides'}
                              </span>
                            ) : (
                              <span className="text-white/30 font-mono text-xs">0 overrides</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <StatusBadge
                              status={cmd.dangerLevel}
                              variant={
                                cmd.dangerLevel === 'CRITICAL' || cmd.dangerLevel === 'HIGH'
                                  ? 'danger'
                                  : cmd.dangerLevel === 'MEDIUM'
                                  ? 'warning'
                                  : 'neutral'
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <CommandAclDrawer
            command={selectedCommandForAcl}
            isOpen={Boolean(selectedCommandForAcl)}
            onClose={() => setSelectedCommandForAcl(null)}
            roles={roles}
            onSave={handleSaveCommandAcl}
          />
        </div>
      )}

      {/* TAB 3: Role Policies */}
      {activeTab === 'roles' && (
        <RolePoliciesTable
          policies={rolePolicies}
          profiles={profiles}
          roles={roles}
          onSavePolicies={handleSaveRolePolicies}
        />
      )}

      {/* TAB 4: User Overrides */}
      {activeTab === 'users' && (
        <UserOverridesList
          overrides={userOverrides}
          onSaveOverrides={handleSaveUserOverrides}
        />
      )}

      {/* TAB 5: Access Preview Simulator */}
      {activeTab === 'preview' && (
        <AccessPreviewer
          roles={roles}
          profiles={profiles}
          rolePolicies={rolePolicies}
          userOverrides={userOverrides}
        />
      )}

      {/* TAB 6: Security Audit Log */}
      {activeTab === 'audit' && <AuditLogTable guildId={guildId} />}
    </div>
  );
}
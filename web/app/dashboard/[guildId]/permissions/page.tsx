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
import { HawkSelect } from '@/components/ui/HawkSelect';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  Shield,
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
  const [isOwner, setIsOwner] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commandFilterOptions = [
    { value: 'ALL', label: 'All Commands' },
    { value: 'OVERRIDDEN', label: 'Has Overrides' },
    { value: 'CRITICAL', label: 'High/Critical Risk' },
  ];

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
          if (data.isOwner !== undefined) setIsOwner(Boolean(data.isOwner));
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
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#101217] dark:text-[#f0f2f5] flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-indigo-400" />
            Permissions & Access Rules
          </h1>
          <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8c949e]">
            Configure dashboard access profiles, Discord command ACL overrides, role policies, and audit trails.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Access Profiles"
          value={profiles.length}
          subtitle="Granular permission sets"
          icon={Shield}
        />
        <StatCard
          title="Role Policies"
          value={rolePolicies.length}
          subtitle="Mapped Discord server roles"
          icon={Users}
        />
        <StatCard
          title="User Overrides"
          value={userOverrides.length}
          subtitle="Explicit member exceptions"
          icon={User}
        />
        <StatCard
          title="Command ACLs"
          value={commandAcls.length}
          subtitle="Protected bot commands"
          icon={Command}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-black/[0.08] dark:border-[#1a1d24] gap-6 text-xs font-medium overflow-x-auto">
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
              className={`pb-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-indigo-500 text-indigo-600 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-[#717882] hover:text-gray-700 dark:hover:text-[#c1c7cd]'
              }`}
            >
              <Icon className="w-4 h-4" />
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
            <div className="lg:col-span-4 bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-3 shadow-xs">
              <SectionHeader
                title="Profiles Matrix"
                description="Select a role profile to inspect and configure permission grants."
              />

              <HawkScrollArea maxHeight="60vh" className="space-y-2 pr-1">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      selectedProfileId === p.id
                        ? 'bg-indigo-50 dark:bg-[#14161b] border-indigo-500/50 text-[#101217] dark:text-white shadow-sm'
                        : 'bg-gray-50 dark:bg-[#121418] border-black/[0.08] dark:border-[#1a1d24] text-gray-700 dark:text-[#c1c7cd] hover:border-gray-300 dark:hover:border-[#262a33] hover:bg-gray-100 dark:hover:bg-[#16181d]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#101217] dark:text-white">{p.name}</span>
                      {p.isPreset && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Preset
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-[#8c949e] mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                ))}
              </HawkScrollArea>
            </div>

            {/* Right Matrix View (8 cols) */}
            <div className="lg:col-span-8 bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.08] dark:border-[#1a1d24]">
                <div>
                  <h3 className="text-sm font-semibold text-[#101217] dark:text-white tracking-tight">{activeProfile.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-[#8c949e] mt-0.5">{activeProfile.description}</p>
                </div>

                <StatusBadge status={activeProfile.isPreset ? 'Preset Profile' : 'Custom'} variant="info" />
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
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Bot Command Access Control Lists"
            description="Manage role and user overrides per command to restrict destructive or economy commands."
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#717882]" />
              <input
                type="text"
                placeholder="Search commands or descriptions..."
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                className="w-full bg-white dark:bg-[#14161b] border border-black/[0.08] dark:border-[#20242c] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#101217] dark:text-white focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <div className="w-48">
              <HawkSelect
                options={commandFilterOptions}
                value={commandFilter}
                onChange={(val) => setCommandFilter(val as any)}
                searchable={false}
              />
            </div>
          </div>

          {/* Commands Table */}
          <div className="border border-black/[0.08] dark:border-[#1a1d24] rounded-lg overflow-hidden bg-white dark:bg-[#121418]">
            <HawkScrollArea maxHeight="55vh">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-[#0d0e11] border-b border-black/[0.08] dark:border-[#1a1d24] text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-[#717882]">
                  <tr>
                    <th className="py-3 px-4">Command</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Default Profile</th>
                    <th className="py-3 px-4">Overrides</th>
                    <th className="py-3 px-4 text-right">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.08] dark:divide-[#1a1d24]">
                  {filteredCommands.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-[#717882] text-xs">
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
                          className="hover:bg-gray-50 dark:hover:bg-[#16181d]/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-medium text-[#101217] dark:text-white">
                            !{cmd.command}
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-[#8c949e] capitalize">
                            {cmd.category}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-[#c1c7cd] capitalize">
                            {cmd.defaultRoleProfile}
                          </td>
                          <td className="py-3 px-4">
                            {overrideCount > 0 ? (
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                {overrideCount} custom {overrideCount === 1 ? 'override' : 'overrides'}
                              </span>
                            ) : (
                              <span className="text-gray-500 dark:text-[#717882] font-mono text-xs">0 overrides</span>
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
            </HawkScrollArea>
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
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Role Policies Configuration"
            description="Assign permission profiles to Discord server roles."
          />
          <RolePoliciesTable
            policies={rolePolicies}
            profiles={profiles}
            roles={roles}
            onSavePolicies={handleSaveRolePolicies}
          />
        </div>
      )}

      {/* TAB 4: User Overrides */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="User Overrides & Exceptions"
            description="Grant explicit profile assignments to individual Discord users regardless of roles."
          />
          <UserOverridesList
            overrides={userOverrides}
            onSaveOverrides={handleSaveUserOverrides}
            isOwner={isOwner}
            profiles={profiles}
          />
        </div>
      )}

      {/* TAB 5: Access Preview Simulator */}
      {activeTab === 'preview' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Access Rights Simulator"
            description="Test effective permissions for any member or role combination in your guild."
          />
          <AccessPreviewer
            roles={roles}
            profiles={profiles}
            rolePolicies={rolePolicies}
            userOverrides={userOverrides}
          />
        </div>
      )}

      {/* TAB 6: Security Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#0c0d10] border border-black/[0.08] dark:border-[#1a1d24] rounded-xl p-5 space-y-5 shadow-xs">
          <SectionHeader
            title="Permissions Change Audit Log"
            description="Immutable ledger tracking every modification to profiles, role policies, and command overrides."
          />
          <AuditLogTable guildId={guildId} />
        </div>
      )}
    </div>
  );
}
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
import { usePageEntrance } from '@/hooks/useAnimation';
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

  const containerRef = usePageEntrance();
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
    <div ref={containerRef} className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#a9adb2]" />
            <span>Permissions & Access Rules</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
            Configure dashboard access profiles, Discord command ACL overrides, role policies, and audit logs.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-md bg-success-soft border border-success-border flex items-center gap-2 text-xs text-success-text">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-md bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 text-critical shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#1c1f23] overflow-x-auto pb-px">
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
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-[#f1f2f3] text-[#f1f2f3] font-semibold'
                  : 'border-transparent text-[#7e8389] hover:text-[#f1f2f3] hover:border-[#24272b]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#f1f2f3]' : 'text-[#7e8389]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Dashboard Access & Permission Matrix */}
      {activeTab === 'access' && (
        <div className="space-y-6" data-animate-section>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Profiles List (4 cols) */}
            <div className="lg:col-span-4 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
                Permission Profiles ({profiles.length})
              </span>

              <HawkScrollArea maxHeight="60vh" className="space-y-1.5 pr-1">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`p-3 rounded-md border cursor-pointer transition-all ${
                      selectedProfileId === p.id
                        ? 'bg-[#17191c] border-[#3e434a] text-[#f1f2f3] shadow-sm'
                        : 'bg-[#0d0e10] border-[#24272b] text-[#d5d7da] hover:border-[#2b2f34] hover:bg-[#121417]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#f1f2f3]">{p.name}</span>
                      {p.isPreset && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm bg-[#121417] text-[#7e8389] border border-[#24272b]">
                          Preset
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7e8389] mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                ))}
              </HawkScrollArea>
            </div>

            {/* Right Matrix View (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#f1f2f3] tracking-tight">{activeProfile.name}</h3>
                  <p className="text-xs text-[#7e8389] mt-0.5">{activeProfile.description}</p>
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
        <div className="space-y-4" data-animate-section>
          <div className="p-3.5 rounded-md bg-[#0d0e10] border border-[#24272b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7e8389]" />
              <input
                type="text"
                placeholder="Search commands or descriptions..."
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                className="glass-input pl-8 text-xs font-sans"
              />
            </div>

            <div className="w-44">
              <HawkSelect
                options={commandFilterOptions}
                value={commandFilter}
                onChange={(val) => setCommandFilter(val as any)}
                searchable={false}
              />
            </div>
          </div>

          {/* Commands Table with HawkScrollArea */}
          <div className="border border-[#24272b] rounded-md overflow-hidden bg-[#0d0e10]">
            <HawkScrollArea maxHeight="55vh">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#08090a] border-b border-[#1c1f23] text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
                  <tr>
                    <th className="py-2.5 px-4">Command</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Default Profile</th>
                    <th className="py-2.5 px-4">Overrides</th>
                    <th className="py-2.5 px-4 text-right">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1f23]">
                  {filteredCommands.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#7e8389] text-xs">
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
                          className="hover:bg-[#121417]/50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-4 font-mono font-medium text-[#f1f2f3]">
                            !{cmd.command}
                          </td>
                          <td className="py-2.5 px-4 text-[#a9adb2] capitalize">
                            {cmd.category}
                          </td>
                          <td className="py-2.5 px-4 text-[#d5d7da] capitalize">
                            {cmd.defaultRoleProfile}
                          </td>
                          <td className="py-2.5 px-4">
                            {overrideCount > 0 ? (
                              <span className="text-[10px] font-mono text-success-text bg-success-soft border border-success-border px-2 py-0.5 rounded">
                                {overrideCount} custom {overrideCount === 1 ? 'override' : 'overrides'}
                              </span>
                            ) : (
                              <span className="text-[#7e8389] font-mono text-xs">0 overrides</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
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
        <div data-animate-section>
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
        <div data-animate-section>
          <UserOverridesList
            overrides={userOverrides}
            onSaveOverrides={handleSaveUserOverrides}
          />
        </div>
      )}

      {/* TAB 5: Access Preview Simulator */}
      {activeTab === 'preview' && (
        <div data-animate-section>
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
        <div data-animate-section>
          <AuditLogTable guildId={guildId} />
        </div>
      )}
    </div>
  );
}
'use client';
import * as Tabs from '@radix-ui/react-tabs';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { AnimatedDrawer } from '@/components/ui/AnimatedDrawer';
import { HawkSelect } from '@/components/ui/HawkSelect';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import { useToast } from '@/components/ui/Toast';
import { PermissionMatrix } from '@/components/Permissions/PermissionMatrix';
import { CommandAclDrawer } from '@/components/Permissions/CommandAclDrawer';
import { RolePoliciesTable } from '@/components/Permissions/RolePoliciesTable';
import { UserOverridesList } from '@/components/Permissions/UserOverridesList';
import { AccessPreviewer } from '@/components/Permissions/AccessPreviewer';
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
  Clock,
  Filter,
  RefreshCw,
  Loader2,
  ChevronRight,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import {
  PermissionProfile,
  RolePolicy,
  UserOverride,
  CommandAcl,
  DEFAULT_PRESET_PROFILES,
} from '@/lib/permissions';

import type { AuditEvent as AuditLogEntry } from '@/lib/audit';
import { formatAuditValue } from '@/lib/auditDisplay';

export default function PermissionsMasterPage() {
  const { guildId } = useParams() as { guildId: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get('tab') === 'simulator' ? 'preview' : searchParams.get('tab') || 'commands';

  const { roles } = useGuildData();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); setCommandSearch(searchParams.get("command") || ""); }, [initialTab, searchParams]);
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('administrator');
  const [rolePolicies, setRolePolicies] = useState<RolePolicy[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserOverride[]>([]);
  const [commandAcls, setCommandAcls] = useState<CommandAcl[]>([]);
  const [selectedCommandForAcl, setSelectedCommandForAcl] = useState<CommandAcl | null>(null);

  const [commandSearch, setCommandSearch] = useState(searchParams.get('command') || '');
  const [commandFilter, setCommandFilter] = useState<'ALL' | 'OVERRIDDEN' | 'CRITICAL'>('ALL');
  const [isOwner, setIsOwner] = useState(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audit Tab State
  const [selectedAudit, setSelectedAudit] = useState<AuditLogEntry | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditModule, setAuditModule] = useState('ALL');
  const [auditSeverity, setAuditSeverity] = useState('ALL');

  // Fetch live permissions bundle
  const loadPermissions = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/permissions`);
      if (!res.ok) throw new Error("Unable to load permissions. Check your access and retry.");
      if (res.ok) {
        const data = await res.json();
        if (data.profiles) setProfiles(data.profiles);
        if (data.rolePolicies) setRolePolicies(data.rolePolicies);
        if (data.userOverrides) setUserOverrides(data.userOverrides);
        if (data.commandAcls) setCommandAcls(data.commandAcls);
        if (data.isOwner !== undefined) setIsOwner(Boolean(data.isOwner));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load permissions.');
    }
  }, [guildId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Fetch live audit trail from DB
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      if (auditModule !== 'ALL') params.append('module', auditModule);
      if (auditSeverity !== 'ALL') params.append('severity', auditSeverity);
      if (auditSearch.trim()) params.append('q', auditSearch.trim());

      const res = await apiFetch(`/api/guilds/${guildId}/audit?${params.toString()}`);
      if (!res.ok) throw new Error("Unable to load audit history. Check access and retry.");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        const entryId = searchParams.get('entry');
        if (entryId) setSelectedAudit((data.logs || []).find((entry: AuditLogEntry) => entry.id === entryId) || null);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load audit history.');
    } finally {
      setAuditLoading(false);
    }
  }, [guildId, auditModule, auditSeverity, auditSearch]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  const handleSaveProfiles = async (updatedProfiles: PermissionProfile[]) => {
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_profiles', data: { profiles: updatedProfiles } }),
      });
      if (!res.ok) throw new Error('Failed to persist profile updates');
      setProfiles(updatedProfiles);
      setStatusMessage('Access profiles saved successfully.');
      success('Permission profiles updated');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      const msg = err.message || 'Error saving profiles';
      setErrorMessage(msg);
      error(msg);
    }
  };

  const handleSaveRolePolicies = async (updated: RolePolicy[]) => {
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_role_policies', data: { rolePolicies: updated } }),
      });
      if (!res.ok) throw new Error('Failed to save role policies');
      setRolePolicies(updated);
      setStatusMessage('Role policies updated.');
      success('Role policies synchronized');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      const msg = err.message || 'Error updating role policies';
      setErrorMessage(msg);
      error(msg);
    }
  };

  const handleSaveUserOverrides = async (updated: UserOverride[]) => {
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_user_overrides', data: { userOverrides: updated } }),
      });
      if (!res.ok) throw new Error('Failed to update user overrides');
      setUserOverrides(updated);
      setStatusMessage('User overrides updated.');
      success('User overrides saved');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      const msg = err.message || 'Error updating user overrides';
      setErrorMessage(msg);
      error(msg);
    }
  };

  const handleSaveCommandAcl = async (updated: CommandAcl) => {
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/permissions`, {
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
      if (!res.ok) throw new Error('Failed to update command permit');
      setCommandAcls((prev) =>
        prev.map((c) => (c.command === updated.command ? updated : c))
      );
      setStatusMessage(`Command permit updated for !${updated.command}`);
      success(`Command ACL updated for !${updated.command}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      const msg = err.message || 'Error updating command ACL';
      setErrorMessage(msg);
      error(msg);
      throw err;
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
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      <PageHeader guildId={guildId} title="Permissions & rules" description="Manage dashboard access, command policies, and individual exceptions. Inspect how each decision is resolved." actions={<button className="btn-secondary" onClick={loadPermissions}><RefreshCw size={14} className="mr-2"/>Refresh access</button>}/>
      {/* Alert Banners */}
      {statusMessage && (
        <div className="p-3 rounded-md bg-success/10 border border-success/20 flex items-center gap-2 text-xs font-sans text-success-text">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-success-text" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-md bg-critical/10 border border-critical/20 flex items-center gap-2 text-xs font-sans text-critical-text">
          <AlertCircle className="w-4 h-4 shrink-0 text-critical-text" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 py-3 text-xs text-text-secondary"><span><strong className="text-text-primary">{commandAcls.length}</strong> command policies</span><span><strong className="text-text-primary">{rolePolicies.length}</strong> role policies</span><span><strong className="text-text-primary">{userOverrides.length}</strong> user overrides</span><span><strong className="text-text-primary">{profiles.length}</strong> profiles</span></div>
      {/* 3. Numbered Navigation Tabs */}
      <Tabs.Root value={activeTab} onValueChange={value => router.push(`/dashboard/${guildId}/permissions?tab=${value}`)}><Tabs.List aria-label="Access management sections" className="flex items-center gap-1 border-b border-border pb-0 font-sans text-xs overflow-x-auto">
        {[
          { id: 'commands', tag: '', label: 'command acls', icon: Command },
          { id: 'profiles', tag: '', label: 'access profiles', icon: Shield },
          { id: 'roles', tag: '', label: 'role policies', icon: Users },
          { id: 'users', tag: '', label: 'user overrides', icon: User },
          { id: 'preview', tag: '', label: 'simulator', icon: Eye },
          { id: 'audit', tag: '', label: 'audit trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}

              className={`px-3 py-2 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-accent text-text-primary font-semibold bg-surface-4/50'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.02]'
              }`}
            >

              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </Tabs.Trigger>
          );
        })}
      </Tabs.List></Tabs.Root>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: Command Access Control Lists */}
      {activeTab === 'commands' && (
        <div className="surface-container space-y-0">
          <div className="panel-header flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-success-text">commands &gt;</span>
              <span className="text-text-secondary">command acls ({filteredCommands.length} of {commandAcls.length})</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="filter commands..."
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  className="glass-input pl-7 text-[11px] py-1 font-sans"
                />
              </div>

              <HawkSelect label="Command filter" className="min-w-[150px]" value={commandFilter} onChange={value => setCommandFilter(value as any)} options={[{ value: 'ALL', label: 'all commands' }, { value: 'OVERRIDDEN', label: 'overridden only' }, { value: 'CRITICAL', label: 'high/critical risk' }]}/>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-sidebar border-b border-white/[0.06] text-[10px] text-text-muted uppercase tracking-wider select-none">
                <tr>
                  <th className="py-2.5 px-4">Command</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Default Profile</th>
                  <th className="py-2.5 px-4">Overrides</th>
                  <th className="py-2.5 px-4 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredCommands.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-secondary text-xs">
                      no commands matching search criteria
                    </td>
                  </tr>
                ) : (
                  filteredCommands.map((cmd) => {
                    const overrideCount = (cmd.roleOverrides?.length || 0) + (cmd.userOverrides?.length || 0);

                    const riskTagClass =
                      cmd.dangerLevel === 'CRITICAL' || cmd.dangerLevel === 'HIGH'
                        ? 'text-critical-text bg-critical/10 border-critical/25'
                        : cmd.dangerLevel === 'MEDIUM'
                        ? 'text-warning-text bg-warning/10 border-warning/25'
                        : 'text-success-text bg-success/10 border-success/25';

                    return (
                      <tr
                        key={cmd.command}
                        onClick={() => setSelectedCommandForAcl(cmd)}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-semibold text-text-primary">
                          <span className="text-success-text">!</span>{cmd.command}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary capitalize">
                          {cmd.category}
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary capitalize">
                          {cmd.defaultRoleProfile}
                        </td>
                        <td className="py-2.5 px-4">
                          {overrideCount > 0 ? (
                            <span className="text-[10px] font-sans text-success-text bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                              {overrideCount} {overrideCount === 1 ? 'override' : 'overrides'}
                            </span>
                          ) : (
                            <span className="text-text-muted text-[11px]">0 overrides</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={`inline-block text-[10px] font-sans px-2 py-0.5 rounded border uppercase ${riskTagClass}`}>
                            {cmd.dangerLevel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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

      {/* TAB 2: Profiles Matrix */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Profiles List (4 cols) */}
          <div className="lg:col-span-4 surface-container">
            <div className="panel-header">
              <span className="text-success-text">profiles &gt;</span>
              <span className="text-text-secondary">permission sets</span>
            </div>

            <div className="p-3 space-y-2 max-h-[65vh] overflow-y-auto">
              {profiles.map((p) => {
                const isSelected = selectedProfileId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`p-3 rounded-md border cursor-pointer transition-all font-sans ${
                      isSelected
                        ? 'bg-surface-4 border-success/40 text-white shadow-sm'
                        : 'bg-surface-1 border-white/[0.04] text-text-secondary hover:border-white/[0.1] hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary">{p.name}</span>
                      {p.isPreset && (
                        <span className="text-[9px] font-sans uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-text-secondary border border-white/[0.08]">
                          preset
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Matrix View (8 cols) */}
          <div className="lg:col-span-8 surface-container">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <span className="text-success-text">matrix &gt;</span>
                <span className="text-text-primary">{activeProfile.name}</span>
              </div>
              <span className="font-sans text-[10px] text-text-secondary px-2 py-0.5 rounded bg-white/[0.04]">
                {activeProfile.isPreset ? 'preset profile' : 'custom profile'}
              </span>
            </div>

            <div className="p-4 sm:p-6">
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

      {/* TAB 3: Role Policies */}
      {activeTab === 'roles' && (
        <div className="surface-container">
          <div className="panel-header">
            <span className="text-success-text">roles &gt;</span>
            <span className="text-text-secondary">discord server role permission assignments</span>
          </div>

          <div className="p-4 sm:p-6">
            <RolePoliciesTable
              policies={rolePolicies}
              profiles={profiles}
              roles={roles}
              onSavePolicies={handleSaveRolePolicies}
            />
          </div>
        </div>
      )}

      {/* TAB 4: User Overrides */}
      {activeTab === 'users' && (
        <div className="surface-container">
          <div className="panel-header">
            <span className="text-success-text">users &gt;</span>
            <span className="text-text-secondary">explicit member overrides &amp; exceptions</span>
          </div>

          <div className="p-4 sm:p-6">
            <UserOverridesList
              overrides={userOverrides}
              onSaveOverrides={handleSaveUserOverrides}
              isOwner={isOwner}
              profiles={profiles}
            />
          </div>
        </div>
      )}

      {/* TAB 5: Access Rights Simulator */}
      {activeTab === 'preview' && (
        <div className="surface-container">
          <div className="panel-header">
            <span className="text-success-text">simulator &gt;</span>
            <span className="text-text-secondary">effective rights inspector</span>
          </div>

          <div className="p-4 sm:p-6">
            <AccessPreviewer
              roles={roles}
              profiles={profiles}
              rolePolicies={rolePolicies}
              userOverrides={userOverrides}
            />
          </div>
        </div>
      )}

      {/* TAB 6: Security Audit Trail (Real DB logs) */}
      {activeTab === 'audit' && (
        <div className="surface-container space-y-0">
          <div className="panel-header flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-success-text">audit &gt;</span>
              <span className="text-text-secondary">real security &amp; permission activity stream ({auditLogs.length} events)</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-40 sm:w-56">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="search audit..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="glass-input pl-7 text-[11px] py-1 font-sans"
                />
              </div>

              <HawkSelect label="Audit module" className="min-w-[150px]" value={auditModule} onChange={value => setAuditModule(value)} options={[{ value: 'ALL', label: 'all modules' }, { value: 'permissions', label: 'permissions' }, { value: 'economy', label: 'economy' }, { value: 'store', label: 'store' }, { value: 'welcome', label: 'welcome' }, { value: 'general', label: 'general' }]}/>

              <HawkSelect label="Audit severity" className="min-w-[150px]" value={auditSeverity} onChange={value => setAuditSeverity(value)} options={[{ value: 'ALL', label: 'all severities' }, { value: 'INFO', label: 'info' }, { value: 'WARNING', label: 'warning' }, { value: 'CRITICAL', label: 'critical' }]}/>

              <button
                type="button"
                onClick={loadAuditLogs}
                aria-label="Refresh audit log"
                disabled={auditLoading}
                className="btn-secondary py-1 px-2 text-[11px] shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${auditLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-sidebar border-b border-white/[0.06] text-[10px] text-text-muted uppercase tracking-wider select-none">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Module / Action</th>
                  <th className="py-2.5 px-4">Changes</th>
                  <th className="py-2.5 px-4 text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {auditLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-secondary">
                      <Loader2 className="w-5 h-5 mx-auto animate-spin text-success-text" />
                      <p className="mt-2 text-xs">loading real audit records from database...</p>
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-secondary text-xs">
                      no audit activity recorded for this criteria
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const sevClass =
                      log.severity === 'CRITICAL'
                        ? 'text-critical-text bg-critical/10 border-critical/25'
                        : log.severity === 'WARNING'
                        ? 'text-warning-text bg-warning/10 border-warning/25'
                        : 'text-info-text bg-info/10 border-info/25';

                    const formattedDate = new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19);

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-4 text-text-secondary text-[11px] whitespace-nowrap">
                          <button className="text-left hover:underline font-mono" onClick={() => setSelectedAudit(log)} aria-label={`Inspect ${log.action} at ${formattedDate}`}>{formattedDate}</button>
                        </td>
                        <td className="py-2.5 px-4 text-text-primary font-semibold whitespace-nowrap">
                          {log.userName || log.userId}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="text-success-text font-semibold">[{log.module}]</span>{' '}
                          <span className="text-text-secondary">{log.action}</span>
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary text-[11px]">
                          <button className="text-text-secondary hover:underline" onClick={() => setSelectedAudit(log)}>View change details</button>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <span className={`inline-block text-[10px] font-sans px-2 py-0.5 rounded border uppercase ${sevClass}`}>
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AnimatedDrawer isOpen={Boolean(selectedAudit)} onClose={() => setSelectedAudit(null)} title="Audit details" subtitle={selectedAudit?.action}>
        {selectedAudit && <div className="space-y-5 text-sm"><dl className="space-y-3"><div><dt className="text-text-muted">Actor</dt><dd>{selectedAudit.userName || selectedAudit.userId}</dd></div><div><dt className="text-text-muted">Time</dt><dd className="font-mono text-xs">{selectedAudit.timestamp}</dd></div><div><dt className="text-text-muted">Module</dt><dd>{selectedAudit.module}</dd></div><div><dt className="text-text-muted">Severity</dt><dd>{selectedAudit.severity}</dd></div></dl><h3 className="font-semibold">Changes</h3><div><h4 className="text-text-muted text-xs mb-2">Previous value</h4><pre className="whitespace-pre-wrap break-words text-xs font-mono">{formatAuditValue(selectedAudit.previousValue, selectedAudit.target || '')}</pre></div><div><h4 className="text-text-muted text-xs mb-2">New value</h4><pre className="whitespace-pre-wrap break-words text-xs font-mono">{formatAuditValue(selectedAudit.newValue, selectedAudit.target || '')}</pre></div></div>}
      </AnimatedDrawer>
    </div>
  );
}

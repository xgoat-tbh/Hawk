'use client';

import React, { useState, useMemo } from 'react';
import { UserOverride, PermissionProfile } from '@/lib/permissions';
import { UserPicker } from '@/components/ui/UserPicker';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  Trash2,
  Lock,
  Plus,
  Sliders,
  Coins,
  Radio,
  Gamepad2,
  Image as ImageIcon,
  Pin,
  Eye,
  Check,
} from 'lucide-react';

interface UserOverridesListProps {
  overrides: UserOverride[];
  onSaveOverrides: (updated: UserOverride[]) => Promise<void>;
  isOwner?: boolean;
  profiles?: PermissionProfile[];
}

interface UserAccessEntry {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  modules: Record<string, { view: boolean; manage: boolean }>;
}

const DASHBOARD_MODULES = [
  { id: 'general', label: 'General Settings', icon: Sliders, category: 'SERVER' },
  { id: 'economy', label: 'Economy & Rewards', icon: Coins, category: 'ECONOMY' },
  { id: 'pvc', label: 'Private Voice (PVC)', icon: Radio, category: 'VOICE' },
  { id: 'gaming', label: 'Gaming LFG', icon: Gamepad2, category: 'COMMUNITY' },
  { id: 'media', label: 'Media Channels', icon: ImageIcon, category: 'COMMUNITY' },
  { id: 'sticky', label: 'Sticky Notices', icon: Pin, category: 'COMMUNITY' },
  { id: 'permissions', label: 'Permissions & Rules', icon: ShieldCheck, category: 'SYSTEM' },
];

export function UserOverridesList({
  overrides,
  onSaveOverrides,
  isOwner = true,
}: UserOverridesListProps) {
  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<'ADMIN' | 'MOD' | 'VIEWER'>('MOD');
  const [isSaving, setIsSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Group flat overrides into structured user entries
  const userAccessList = useMemo<UserAccessEntry[]>(() => {
    const map = new Map<string, UserAccessEntry>();

    overrides.forEach((o) => {
      let entry = map.get(o.userId);
      if (!entry) {
        entry = {
          userId: o.userId,
          userName: o.userName || `User ${o.userId.slice(-4)}`,
          avatarUrl: o.avatarUrl || null,
          modules: {},
        };
        DASHBOARD_MODULES.forEach((m) => {
          entry!.modules[m.id] = { view: false, manage: false };
        });
        map.set(o.userId, entry);
      } else if (!entry.avatarUrl && o.avatarUrl) {
        entry.avatarUrl = o.avatarUrl;
      }

      if (entry.modules[o.module]) {
        if (o.action === 'manage' && o.effect === 'ALLOW') {
          entry.modules[o.module].manage = true;
          entry.modules[o.module].view = true;
        } else if (o.action === 'view' && o.effect === 'ALLOW') {
          entry.modules[o.module].view = true;
        }
      }
    });

    return Array.from(map.values());
  }, [overrides]);

  // Convert structured user entries back to flat UserOverride array
  const serializeOverrides = (entries: UserAccessEntry[]): UserOverride[] => {
    const list: UserOverride[] = [];
    entries.forEach((u) => {
      Object.entries(u.modules).forEach(([mod, perms]) => {
        if (perms.manage) {
          list.push({
            userId: u.userId,
            userName: u.userName,
            avatarUrl: u.avatarUrl,
            module: mod,
            action: 'manage',
            effect: 'ALLOW',
          });
          list.push({
            userId: u.userId,
            userName: u.userName,
            avatarUrl: u.avatarUrl,
            module: mod,
            action: 'view',
            effect: 'ALLOW',
          });
        } else if (perms.view) {
          list.push({
            userId: u.userId,
            userName: u.userName,
            avatarUrl: u.avatarUrl,
            module: mod,
            action: 'view',
            effect: 'ALLOW',
          });
        }
      });
    });
    return list;
  };


  const handleAddUser = async () => {
    if (!newUserId.trim() || isSaving || !isOwner) return;
    const cleanId = newUserId.trim().replace(/[<@!>]/g, '');

    const currentEntries = [...userAccessList];
    const existing = currentEntries.find((u) => u.userId === cleanId);

    const initialModules: Record<string, { view: boolean; manage: boolean }> = {};
    DASHBOARD_MODULES.forEach((m) => {
      if (selectedPreset === 'ADMIN') {
        initialModules[m.id] = { view: true, manage: true };
      } else if (selectedPreset === 'MOD') {
        const isPerm = m.id === 'permissions';
        initialModules[m.id] = { view: !isPerm, manage: !isPerm };
      } else {
        initialModules[m.id] = { view: true, manage: false };
      }
    });

    if (existing) {
      existing.modules = initialModules;
      existing.userName = newUserName.trim() || existing.userName;
    } else {
      currentEntries.push({
        userId: cleanId,
        userName: newUserName.trim() || `User ${cleanId.slice(-4)}`,
        modules: initialModules,
      });
    }

    setIsSaving(true);
    try {
      await onSaveOverrides(serializeOverrides(currentEntries));
      setNewUserId('');
      setNewUserName('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePermission = async (
    userId: string,
    moduleId: string,
    type: 'view' | 'manage'
  ) => {
    if (!isOwner || isSaving) return;

    const currentEntries = userAccessList.map((u) => {
      if (u.userId !== userId) return u;
      const current = u.modules[moduleId] || { view: false, manage: false };
      const next = { ...current };

      if (type === 'manage') {
        next.manage = !next.manage;
        if (next.manage) next.view = true; // Managing requires view
      } else {
        next.view = !next.view;
        if (!next.view) next.manage = false; // Disabling view removes manage
      }

      return {
        ...u,
        modules: {
          ...u.modules,
          [moduleId]: next,
        },
      };
    });

    setIsSaving(true);
    try {
      await onSaveOverrides(serializeOverrides(currentEntries));
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyPreset = async (userId: string, preset: 'ADMIN' | 'MOD' | 'VIEWER' | 'CLEAR') => {
    if (!isOwner || isSaving) return;

    const currentEntries = userAccessList.map((u) => {
      if (u.userId !== userId) return u;
      const modules: Record<string, { view: boolean; manage: boolean }> = {};

      DASHBOARD_MODULES.forEach((m) => {
        if (preset === 'ADMIN') {
          modules[m.id] = { view: true, manage: true };
        } else if (preset === 'MOD') {
          const isPerm = m.id === 'permissions';
          modules[m.id] = { view: !isPerm, manage: !isPerm };
        } else if (preset === 'VIEWER') {
          modules[m.id] = { view: true, manage: false };
        } else {
          modules[m.id] = { view: false, manage: false };
        }
      });

      return { ...u, modules };
    });

    setIsSaving(true);
    try {
      await onSaveOverrides(serializeOverrides(currentEntries));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeUser = async (userId: string) => {
    if (!isOwner || isSaving) return;
    const currentEntries = userAccessList.filter((u) => u.userId !== userId);
    setIsSaving(true);
    try {
      await onSaveOverrides(serializeOverrides(currentEntries));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = userAccessList.filter(
    (u) =>
      u.userName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.userId.includes(searchFilter)
  );

  return (
    <div className="space-y-5">
      {/* Owner Security Banner */}
      {!isOwner && (
        <div className="p-3.5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-200">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold text-amber-300">Read-Only Mode:</span> Only the Server Owner and Bot Superadmins can grant dashboard access or modify user permissions.
          </div>
        </div>
      )}

      {/* Add User Bar (Owner Only) */}
      {isOwner && (
        <div className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#f1f2f3] flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#7e8389]" />
              Grant User Dashboard Access
            </span>
            <span className="text-[10px] font-mono text-[#7e8389]">
              Owner Access Control
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6 space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#7e8389]">Discord User</label>
              <UserPicker
                value={newUserId}
                onChange={(id, name) => {
                  setNewUserId(id);
                  if (name) setNewUserName(name);
                }}
                placeholder="Search member or paste Discord User ID..."
              />
            </div>

            <div className="sm:col-span-4 space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#7e8389]">Initial Access Level</label>
              <div className="flex bg-[#0a0b0d] p-0.5 rounded-md border border-[#24272b]">
                <button
                  type="button"
                  onClick={() => setSelectedPreset('MOD')}
                  className={`flex-1 py-1.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    selectedPreset === 'MOD' ? 'bg-[#25282c] text-[#f1f2f3]' : 'text-[#7e8389]'
                  }`}
                >
                  Moderator
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPreset('ADMIN')}
                  className={`flex-1 py-1.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    selectedPreset === 'ADMIN' ? 'bg-[#25282c] text-[#f1f2f3]' : 'text-[#7e8389]'
                  }`}
                >
                  Full Admin
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPreset('VIEWER')}
                  className={`flex-1 py-1.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    selectedPreset === 'VIEWER' ? 'bg-[#25282c] text-[#f1f2f3]' : 'text-[#7e8389]'
                  }`}
                >
                  View Only
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddUser}
                disabled={!newUserId.trim() || isSaving}
                className="btn-primary w-full py-2 px-3 text-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Grant</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Overrides Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#f1f2f3]">
              Authorized Users ({userAccessList.length})
            </span>
            <span className="text-[10px] font-mono text-[#7e8389]">
              Direct dashboard grants
            </span>
          </div>

          {userAccessList.length > 3 && (
            <input
              type="text"
              placeholder="Filter users..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-[#0a0b0d] border border-[#24272b] rounded px-2.5 py-1 text-xs text-[#f1f2f3] placeholder:text-[#7e8389] max-w-xs focus:outline-none font-mono"
            />
          )}
        </div>

        {userAccessList.length === 0 ? (
          <div className="p-8 rounded-md bg-[#0d0e10] border border-[#24272b] text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-[#7e8389] mx-auto opacity-50" />
            <h4 className="text-xs font-medium text-[#f1f2f3]">No User Overrides Configured</h4>
            <p className="text-[11px] text-[#7e8389] max-w-sm mx-auto">
              Dashboard access currently follows server role policies. Add individual users above to grant or restrict their module access.
            </p>
          </div>
        ) : (
          <HawkScrollArea maxHeight="62vh" className="space-y-3 pr-1">
            {filteredUsers.map((user) => {
              const activeCount = Object.values(user.modules).filter((m) => m.view || m.manage).length;
              const isFullAdmin = Object.values(user.modules).every((m) => m.view && m.manage);

              return (
                <div
                  key={user.userId}
                  className="p-4 rounded-md bg-[#0d0e10] border border-[#24272b] space-y-4 hover:border-[#2f333a] transition-colors"
                >
                  {/* User Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c1f23] pb-3">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-[#2b2f34] shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#17191c] border border-[#2b2f34] flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#a9adb2]" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#f1f2f3]">{user.userName}</span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                              isFullAdmin
                                ? 'bg-success-soft text-success-text border-success-border'
                                : activeCount > 0
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                : 'bg-[#17191c] text-[#7e8389] border-[#24272b]'
                            }`}
                          >
                            {isFullAdmin ? 'FULL ADMIN' : `${activeCount} MODULES`}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-[#7e8389]">{user.userId}</div>
                      </div>
                    </div>

                    {/* Quick Presets & Revoke Action */}
                    {isOwner && (
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <span className="text-[10px] font-mono text-[#7e8389] mr-1 hidden md:inline">Preset:</span>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(user.userId, 'ADMIN')}
                          disabled={isSaving}
                          className="px-2 py-1 rounded bg-[#17191c] hover:bg-[#25282c] border border-[#24272b] text-[10px] font-mono text-[#f1f2f3] transition-colors"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(user.userId, 'MOD')}
                          disabled={isSaving}
                          className="px-2 py-1 rounded bg-[#17191c] hover:bg-[#25282c] border border-[#24272b] text-[10px] font-mono text-[#f1f2f3] transition-colors"
                        >
                          Mod
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(user.userId, 'VIEWER')}
                          disabled={isSaving}
                          className="px-2 py-1 rounded bg-[#17191c] hover:bg-[#25282c] border border-[#24272b] text-[10px] font-mono text-[#f1f2f3] transition-colors"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeUser(user.userId)}
                          disabled={isSaving}
                          className="p-1.5 rounded text-[#7e8389] hover:text-critical-text hover:bg-critical-soft transition-colors ml-1"
                          title="Revoke all dashboard access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Modules Matrix Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {DASHBOARD_MODULES.map((mod) => {
                      const Icon = mod.icon;
                      const perm = user.modules[mod.id] || { view: false, manage: false };

                      return (
                        <div
                          key={mod.id}
                          className={`p-2.5 rounded border transition-colors flex flex-col justify-between gap-2 ${
                            perm.manage
                              ? 'bg-[#12161b] border-blue-500/30'
                              : perm.view
                              ? 'bg-[#0f1214] border-[#2b2f34]'
                              : 'bg-[#08090a] border-[#1c1f23] opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-[#7e8389] shrink-0" />
                            <span className="text-xs font-medium text-[#f1f2f3] truncate">
                              {mod.label}
                            </span>
                          </div>

                          {/* View / Manage Toggles */}
                          <div className="flex items-center gap-1.5 pt-1 border-t border-[#1c1f23]">
                            {/* VIEW TOGGLE */}
                            <button
                              type="button"
                              disabled={!isOwner || isSaving}
                              onClick={() => handleTogglePermission(user.userId, mod.id, 'view')}
                              className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono font-medium flex items-center justify-center gap-1 transition-all ${
                                perm.view
                                  ? 'bg-[#1e2329] text-[#f1f2f3] border border-[#3e434a]'
                                  : 'bg-[#0a0b0d] text-[#7e8389] border border-[#1c1f23] hover:text-[#d5d7da]'
                              } disabled:pointer-events-none disabled:opacity-75`}
                            >
                              <Eye className="w-2.5 h-2.5 shrink-0" />
                              <span>VIEW</span>
                              {perm.view && <Check className="w-2.5 h-2.5 text-success shrink-0" />}
                            </button>

                            {/* MANAGE TOGGLE */}
                            <button
                              type="button"
                              disabled={!isOwner || isSaving}
                              onClick={() => handleTogglePermission(user.userId, mod.id, 'manage')}
                              className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono font-medium flex items-center justify-center gap-1 transition-all ${
                                perm.manage
                                  ? 'bg-success text-black font-semibold'
                                  : 'bg-[#0a0b0d] text-[#7e8389] border border-[#1c1f23] hover:text-[#d5d7da]'
                              } disabled:pointer-events-none disabled:opacity-75`}
                            >
                              <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                              <span>MANAGE</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </HawkScrollArea>
        )}
      </div>
    </div>
  );
}

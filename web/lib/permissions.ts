export type ActionType = 'view' | 'manage' | 'delete';

export interface ModulePermission {
  module: string;
  label: string;
  category: 'SERVER' | 'ECONOMY' | 'VOICE' | 'COMMUNITY' | 'SYSTEM';
  actions: {
    view: boolean;
    manage: boolean;
    delete: boolean;
  };
  subItems?: { id: string; label: string; action: ActionType }[];
}

export interface PermissionProfile {
  id: string;
  name: string;
  description: string;
  isPreset: boolean;
  inheritsFrom?: string | null;
  permissions: Record<string, { view: boolean; manage: boolean; delete: boolean }>;
}

export interface RolePolicy {
  roleId: string;
  roleName: string;
  profileId: string;
  memberCount: number;
  status: 'active' | 'inactive';
}

export interface UserOverride {
  userId: string;
  userName: string;
  module: string;
  action: ActionType;
  effect: 'ALLOW' | 'DENY';
}

export interface CommandAcl {
  command: string;
  category: string;
  description: string;
  defaultRoleProfile: string;
  requiredDiscordPerm?: string;
  dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  roleOverrides: { roleId: string; effect: 'ALLOW' | 'DENY' }[];
  userOverrides: { userId: string; effect: 'ALLOW' | 'DENY' }[];
}

export interface DangerousActionPolicy {
  actionId: string;
  name: string;
  description: string;
  risk: 'CRITICAL';
  requireOwnerApproval: boolean;
  pendingRequests: {
    requestId: string;
    userId: string;
    userName: string;
    requestedAt: string;
    reason: string;
    payload: any;
  }[];
}

// Built-in Modules Definition
export const MODULE_DEFINITIONS: ModulePermission[] = [
  {
    module: 'general',
    label: 'General Settings',
    category: 'SERVER',
    actions: { view: true, manage: true, delete: false },
    subItems: [
      { id: 'prefix', label: 'Command Prefix', action: 'manage' },
      { id: 'commander_role', label: 'Bot Commander Role', action: 'manage' },
      { id: 'log_channels', label: 'Audit Log Routing', action: 'manage' },
    ],
  },
  {
    module: 'permissions',
    label: 'Permissions & Access Rules',
    category: 'SERVER',
    actions: { view: true, manage: true, delete: true },
    subItems: [
      { id: 'dashboard_access', label: 'Dashboard Access Profiles', action: 'manage' },
      { id: 'command_acl', label: 'Command ACL Overrides', action: 'manage' },
      { id: 'role_policies', label: 'Role Policy Mapping', action: 'manage' },
      { id: 'user_overrides', label: 'User-Specific Overrides', action: 'manage' },
    ],
  },
  {
    module: 'economy',
    label: 'Economy & Rewards',
    category: 'ECONOMY',
    actions: { view: true, manage: true, delete: false },
    subItems: [
      { id: 'currency', label: 'Currency Symbol & Balances', action: 'manage' },
      { id: 'daily_rewards', label: 'Daily Streak Rewards', action: 'manage' },
      { id: 'passive_income', label: 'Passive Chat Income', action: 'manage' },
    ],
  },
  {
    module: 'store',
    label: 'Server Store Catalog',
    category: 'ECONOMY',
    actions: { view: true, manage: true, delete: true },
    subItems: [
      { id: 'create_item', label: 'Add Store Items', action: 'manage' },
      { id: 'delete_item', label: 'Delete Store Items', action: 'delete' },
    ],
  },
  {
    module: 'income',
    label: 'Role Salaries & Wages',
    category: 'ECONOMY',
    actions: { view: true, manage: true, delete: true },
    subItems: [
      { id: 'assign_salary', label: 'Assign Role Salaries', action: 'manage' },
      { id: 'delete_salary', label: 'Revoke Role Salaries', action: 'delete' },
    ],
  },
  {
    module: 'pvc',
    label: 'Private Voice Channels',
    category: 'VOICE',
    actions: { view: true, manage: true, delete: true },
    subItems: [
      { id: 'pvc_rates', label: 'Hourly Voice Rates', action: 'manage' },
      { id: 'pvc_generator', label: 'Auto Channel Generator', action: 'manage' },
      { id: 'pvc_channels', label: 'Voice Container Settings', action: 'manage' },
    ],
  },
  {
    module: 'gaming',
    label: 'Gaming LFG Alerts',
    category: 'VOICE',
    actions: { view: true, manage: true, delete: true },
    subItems: [
      { id: 'gaming_pings', label: 'Voice Role Pings', action: 'manage' },
      { id: 'gaming_channels', label: 'Notification Channels', action: 'manage' },
    ],
  },
  {
    module: 'welcome',
    label: 'Welcome Embed & Greeting',
    category: 'COMMUNITY',
    actions: { view: true, manage: true, delete: false },
    subItems: [
      { id: 'embed_designer', label: 'Rich Embed Designer', action: 'manage' },
      { id: 'test_dispatch', label: 'Live Test Message', action: 'manage' },
    ],
  },
  {
    module: 'community',
    label: 'Community Feedback & Confessions',
    category: 'COMMUNITY',
    actions: { view: true, manage: true, delete: false },
    subItems: [
      { id: 'suggestions', label: 'Suggestion Board', action: 'manage' },
      { id: 'confessions', label: 'Anonymous Confessions', action: 'manage' },
    ],
  },
  {
    module: 'media',
    label: 'Media-Only Channels',
    category: 'COMMUNITY',
    actions: { view: true, manage: true, delete: true },
    subItems: [
      { id: 'media_channels', label: 'Designate Gallery Channels', action: 'manage' },
      { id: 'autothread', label: 'Auto-Discussion Threads', action: 'manage' },
    ],
  },
  {
    module: 'sticky',
    label: 'Persistent Sticky Notices',
    category: 'COMMUNITY',
    actions: { view: true, manage: true, delete: true },
    subItems: [
      { id: 'sticky_post', label: 'Create Channel Sticky', action: 'manage' },
      { id: 'sticky_delete', label: 'Delete Channel Sticky', action: 'delete' },
    ],
  },
  {
    module: 'audit',
    label: 'Security Audit Log',
    category: 'SYSTEM',
    actions: { view: true, manage: false, delete: false },
  },
];

// Predefined Permission Profiles
export const DEFAULT_PRESET_PROFILES: PermissionProfile[] = [
  {
    id: 'administrator',
    name: 'Administrator',
    description: 'Unrestricted full access across all dashboard settings, command ACLs, and dangerous operations.',
    isPreset: true,
    inheritsFrom: null,
    permissions: MODULE_DEFINITIONS.reduce((acc, m) => {
      acc[m.module] = { view: true, manage: true, delete: true };
      return acc;
    }, {} as Record<string, { view: boolean; manage: boolean; delete: boolean }>),
  },
  {
    id: 'moderator',
    name: 'Moderator',
    description: 'Access to moderation logs, suggestions, confessions, sticky notices, and media channels.',
    isPreset: true,
    inheritsFrom: null,
    permissions: {
      general: { view: true, manage: false, delete: false },
      permissions: { view: false, manage: false, delete: false },
      economy: { view: true, manage: false, delete: false },
      store: { view: true, manage: false, delete: false },
      income: { view: false, manage: false, delete: false },
      pvc: { view: true, manage: true, delete: false },
      gaming: { view: true, manage: true, delete: false },
      welcome: { view: true, manage: false, delete: false },
      community: { view: true, manage: true, delete: false },
      media: { view: true, manage: true, delete: true },
      sticky: { view: true, manage: true, delete: true },
      audit: { view: true, manage: false, delete: false },
    },
  },
  {
    id: 'economy_manager',
    name: 'Economy Manager',
    description: 'Manages server currency, starting balances, store catalog items, and role wages.',
    isPreset: true,
    inheritsFrom: null,
    permissions: {
      general: { view: false, manage: false, delete: false },
      permissions: { view: false, manage: false, delete: false },
      economy: { view: true, manage: true, delete: false },
      store: { view: true, manage: true, delete: true },
      income: { view: true, manage: true, delete: true },
      pvc: { view: true, manage: true, delete: false },
      gaming: { view: false, manage: false, delete: false },
      welcome: { view: false, manage: false, delete: false },
      community: { view: false, manage: false, delete: false },
      media: { view: false, manage: false, delete: false },
      sticky: { view: false, manage: false, delete: false },
      audit: { view: true, manage: false, delete: false },
    },
  },
  {
    id: 'community_manager',
    name: 'Community Manager',
    description: 'Manages welcome greeting cards, suggestion feeds, confessions, and channel sticky notes.',
    isPreset: true,
    inheritsFrom: null,
    permissions: {
      general: { view: false, manage: false, delete: false },
      permissions: { view: false, manage: false, delete: false },
      economy: { view: false, manage: false, delete: false },
      store: { view: false, manage: false, delete: false },
      income: { view: false, manage: false, delete: false },
      pvc: { view: false, manage: false, delete: false },
      gaming: { view: true, manage: true, delete: true },
      welcome: { view: true, manage: true, delete: false },
      community: { view: true, manage: true, delete: false },
      media: { view: true, manage: true, delete: true },
      sticky: { view: true, manage: true, delete: true },
      audit: { view: false, manage: false, delete: false },
    },
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only visibility for all configuration modules and statistics without editing rights.',
    isPreset: true,
    inheritsFrom: null,
    permissions: MODULE_DEFINITIONS.reduce((acc, m) => {
      acc[m.module] = { view: true, manage: false, delete: false };
      return acc;
    }, {} as Record<string, { view: boolean; manage: boolean; delete: boolean }>),
  },
];

/**
 * Deterministic Permission Precedence Resolver:
 * 1. Explicit User DENY
 * 2. Explicit User ALLOW
 * 3. Explicit Role DENY
 * 4. Explicit Role ALLOW
 * 5. Inherited Profile (highest role profile)
 * 6. Server Default (Manage Server / Guild Owner)
 */
export function resolveEffectivePermission(params: {
  userId: string;
  userRoleIds: string[];
  module: string;
  action: ActionType;
  isOwnerOrAdmin: boolean;
  profiles: PermissionProfile[];
  rolePolicies: RolePolicy[];
  userOverrides: UserOverride[];
}): { allowed: boolean; reason: string; source: 'USER_OVERRIDE' | 'ROLE_POLICY' | 'SUPERADMIN' | 'DEFAULT_DENY' } {
  const {
    userId,
    userRoleIds,
    module: mod,
    action,
    isOwnerOrAdmin,
    profiles,
    rolePolicies,
    userOverrides,
  } = params;

  // 1. Superadmin / Owner bypass
  if (isOwnerOrAdmin) {
    return { allowed: true, reason: 'Bot Owner / Server Administrator full authority', source: 'SUPERADMIN' };
  }

  // 2. Explicit User Overrides (Precedence 1 & 2)
  const explicitUserOverride = userOverrides.find(
    (o) => o.userId === userId && o.module === mod && o.action === action
  );
  if (explicitUserOverride) {
    return {
      allowed: explicitUserOverride.effect === 'ALLOW',
      reason: `Explicit user override (${explicitUserOverride.effect})`,
      source: 'USER_OVERRIDE',
    };
  }

  // 3. Match Role Policies (Precedence 4 & 5)
  const matchingPolicies = rolePolicies.filter((p) => userRoleIds.includes(p.roleId) && p.status === 'active');
  for (const policy of matchingPolicies) {
    const profile = profiles.find((pr) => pr.id === policy.profileId);
    if (profile && profile.permissions[mod]?.[action]) {
      return {
        allowed: true,
        reason: `Granted by ${profile.name} via role @${policy.roleName}`,
        source: 'ROLE_POLICY',
      };
    }
  }

  // 4. Fallback Default DENY
  return {
    allowed: false,
    reason: 'No role policy or user override grants this permission',
    source: 'DEFAULT_DENY',
  };
}

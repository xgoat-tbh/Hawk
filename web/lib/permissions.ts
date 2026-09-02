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

export interface RuleChainStep {
  step: string;
  result: 'ALLOW' | 'DENY' | 'NEUTRAL' | 'SKIPPED';
  detail: string;
  source: string;
  isWinningRule?: boolean;
}

export interface CommandAccessEvaluation {
  command: string;
  category: string;
  description: string;
  usage: string;
  dangerLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredDiscordPerm?: string;
  effectiveAccess: 'ALLOWED' | 'DENIED';
  hasOverride: boolean;
  reason: string;
  source: 'SUPERADMIN' | 'PUBLIC_COMMAND' | 'USER_OVERRIDE' | 'ROLE_OVERRIDE' | 'ROLE_PROFILE' | 'DEFAULT_DENY';
  matchedRule?: string;
  matchedRole?: string;
  ruleChain: RuleChainStep[];
}

export interface SimulationResponse {
  subject: {
    type: 'role' | 'user';
    id: string;
    name: string;
    isBotAdmin: boolean;
  };
  summary: {
    totalModules: number;
    accessibleModules: number;
    restrictedModules: number;
    totalCommands: number;
    allowedCommands: number;
    deniedCommands: number;
    overriddenCommands: number;
  };
  modules: {
    module: ModulePermission;
    canView: boolean;
    canManage: boolean;
    viewReason: string;
    manageReason: string;
    viewSource: string;
    manageSource: string;
    conflict?: {
      hasConflict: boolean;
      type: string;
      message: string;
    } | null;
  }[];
  commands: CommandAccessEvaluation[];
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
 * Deterministic Permission Precedence Resolver for Dashboard Modules:
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

/**
 * Canonical Deterministic Command Access Resolver:
 * Resolves effective bot command access across public commands, custom permits, role policies, and default restrictions.
 */
export function resolveEffectiveCommandAccess(params: {
  command: {
    name: string;
    category: string;
    description: string;
    usage?: string;
    dangerLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    defaultRoleProfile?: string;
    requiredDiscordPerm?: string;
  };
  userId: string;
  userRoleIds: string[];
  isOwnerOrAdmin: boolean;
  permits: { target_type: 'user' | 'role'; target_id: string; command_name: string | null; module_name: string | null }[];
  commandAcls: CommandAcl[];
  rolePolicies: RolePolicy[];
}): CommandAccessEvaluation {
  const { command, userId, userRoleIds, isOwnerOrAdmin, permits, commandAcls, rolePolicies } = params;
  const ruleChain: RuleChainStep[] = [];

  const cmdName = command.name.toLowerCase();
  const category = command.category.toLowerCase();
  const dangerLevel = command.dangerLevel || 'LOW';
  const usage = command.usage || `!${cmdName}`;

  // Step 1: Superadmin / Bot Admin Simulation Check
  if (isOwnerOrAdmin) {
    const step: RuleChainStep = {
      step: '1. Administrative Authority Check',
      result: 'ALLOW',
      detail: 'Simulated Bot Owner / Administrator maintains full unrestricted command execution bypass.',
      source: 'SUPERADMIN',
      isWinningRule: true,
    };
    ruleChain.push(step);
    return {
      command: cmdName,
      category,
      description: command.description,
      usage,
      dangerLevel,
      requiredDiscordPerm: command.requiredDiscordPerm,
      effectiveAccess: 'ALLOWED',
      hasOverride: false,
      reason: 'Bot Administrator / Server Owner execution bypass.',
      source: 'SUPERADMIN',
      ruleChain,
    };
  } else {
    ruleChain.push({
      step: '1. Administrative Authority Check',
      result: 'NEUTRAL',
      detail: 'Subject is not operating under administrative authority bypass.',
      source: 'SUPERADMIN',
    });
  }

  // Step 2: Global Public Command Check
  const PUBLIC_COMMANDS = ['help', 'afk', 'ping', 'info'];
  if (PUBLIC_COMMANDS.includes(cmdName)) {
    const step: RuleChainStep = {
      step: '2. Global Public Availability Check',
      result: 'ALLOW',
      detail: `Command !${cmdName} is designated as a global public utility command accessible by all members.`,
      source: 'PUBLIC_COMMAND',
      isWinningRule: true,
    };
    ruleChain.push(step);
    return {
      command: cmdName,
      category,
      description: command.description,
      usage,
      dangerLevel,
      requiredDiscordPerm: command.requiredDiscordPerm,
      effectiveAccess: 'ALLOWED',
      hasOverride: false,
      reason: 'Global public command accessible to all members.',
      source: 'PUBLIC_COMMAND',
      ruleChain,
    };
  } else {
    ruleChain.push({
      step: '2. Global Public Availability Check',
      result: 'NEUTRAL',
      detail: `Command !${cmdName} is a restricted command requiring an authorized role, profile, or custom permit.`,
      source: 'PUBLIC_COMMAND',
    });
  }

  // Step 3: Explicit User Overrides & Database Permits (User Level)
  const cmdAcl = commandAcls.find((c) => c.command.toLowerCase() === cmdName);
  const userAclOverride = cmdAcl?.userOverrides?.find((u) => u.userId === userId);
  const userPermit = permits.find(
    (p) =>
      p.target_type === 'user' &&
      p.target_id === userId &&
      (p.command_name === cmdName || p.command_name === null) &&
      (p.module_name === category || p.module_name === null)
  );

  if (userAclOverride) {
    const isAllow = userAclOverride.effect === 'ALLOW';
    const step: RuleChainStep = {
      step: '3. Explicit User ACL Override',
      result: isAllow ? 'ALLOW' : 'DENY',
      detail: `Explicit user override rule configured: ${userAclOverride.effect}`,
      source: 'USER_OVERRIDE',
      isWinningRule: true,
    };
    ruleChain.push(step);
    return {
      command: cmdName,
      category,
      description: command.description,
      usage,
      dangerLevel,
      requiredDiscordPerm: command.requiredDiscordPerm,
      effectiveAccess: isAllow ? 'ALLOWED' : 'DENIED',
      hasOverride: true,
      reason: `Explicit user override set to ${userAclOverride.effect}.`,
      source: 'USER_OVERRIDE',
      matchedRule: `User ${userId} → !${cmdName} → ${userAclOverride.effect}`,
      ruleChain,
    };
  }

  if (userPermit) {
    const step: RuleChainStep = {
      step: '3. User Database Permit',
      result: 'ALLOW',
      detail: `Database custom permit found granting user ${userId} access to ${userPermit.command_name ? `!${userPermit.command_name}` : `all ${userPermit.module_name || 'bot'} commands`}.`,
      source: 'USER_OVERRIDE',
      isWinningRule: true,
    };
    ruleChain.push(step);
    return {
      command: cmdName,
      category,
      description: command.description,
      usage,
      dangerLevel,
      requiredDiscordPerm: command.requiredDiscordPerm,
      effectiveAccess: 'ALLOWED',
      hasOverride: true,
      reason: 'Custom database permit granted specifically to this user.',
      source: 'USER_OVERRIDE',
      matchedRule: `User ${userId} → Permit ${userPermit.command_name || 'ALL'}`,
      ruleChain,
    };
  }

  ruleChain.push({
    step: '3. Explicit User Check',
    result: 'NEUTRAL',
    detail: 'No user-specific override or database permit was found.',
    source: 'USER_OVERRIDE',
  });

  // Step 4: Explicit Role Overrides & Database Permits (Role Level)
  const roleAclOverride = cmdAcl?.roleOverrides?.find((r) => userRoleIds.includes(r.roleId));
  const rolePermit = permits.find(
    (p) =>
      p.target_type === 'role' &&
      userRoleIds.includes(p.target_id) &&
      (p.command_name === cmdName || p.command_name === null) &&
      (p.module_name === category || p.module_name === null)
  );

  if (roleAclOverride) {
    const isAllow = roleAclOverride.effect === 'ALLOW';
    const step: RuleChainStep = {
      step: '4. Explicit Role ACL Override',
      result: isAllow ? 'ALLOW' : 'DENY',
      detail: `Explicit role ACL rule configured for role ${roleAclOverride.roleId}: ${roleAclOverride.effect}`,
      source: 'ROLE_OVERRIDE',
      isWinningRule: true,
    };
    ruleChain.push(step);
    return {
      command: cmdName,
      category,
      description: command.description,
      usage,
      dangerLevel,
      requiredDiscordPerm: command.requiredDiscordPerm,
      effectiveAccess: isAllow ? 'ALLOWED' : 'DENIED',
      hasOverride: true,
      reason: `Explicit role override for role set to ${roleAclOverride.effect}.`,
      source: 'ROLE_OVERRIDE',
      matchedRule: `Role ${roleAclOverride.roleId} → !${cmdName} → ${roleAclOverride.effect}`,
      matchedRole: roleAclOverride.roleId,
      ruleChain,
    };
  }

  if (rolePermit) {
    const step: RuleChainStep = {
      step: '4. Role Database Permit',
      result: 'ALLOW',
      detail: `Database custom permit grants role ${rolePermit.target_id} access to ${rolePermit.command_name ? `!${rolePermit.command_name}` : `all ${rolePermit.module_name || 'bot'} commands`}.`,
      source: 'ROLE_OVERRIDE',
      isWinningRule: true,
    };
    ruleChain.push(step);
    return {
      command: cmdName,
      category,
      description: command.description,
      usage,
      dangerLevel,
      requiredDiscordPerm: command.requiredDiscordPerm,
      effectiveAccess: 'ALLOWED',
      hasOverride: true,
      reason: 'Explicit database permit granted to holding role.',
      source: 'ROLE_OVERRIDE',
      matchedRule: `Role ${rolePermit.target_id} → Permit ${rolePermit.command_name || 'ALL'}`,
      matchedRole: rolePermit.target_id,
      ruleChain,
    };
  }

  ruleChain.push({
    step: '4. Explicit Role Check',
    result: 'NEUTRAL',
    detail: 'No direct role ACL override or database permit was found for assigned roles.',
    source: 'ROLE_OVERRIDE',
  });

  // Step 5: Inherited Role Profile Policy
  const matchingPolicies = rolePolicies.filter((p) => userRoleIds.includes(p.roleId) && p.status === 'active');
  for (const policy of matchingPolicies) {
    const profileId = policy.profileId.toLowerCase();

    // Administrator profile grants everything
    if (profileId === 'administrator') {
      const step: RuleChainStep = {
        step: '5. Role Policy Profile Mapping',
        result: 'ALLOW',
        detail: `Role @${policy.roleName} is assigned the 'Administrator' profile granting complete command authorization.`,
        source: 'ROLE_PROFILE',
        isWinningRule: true,
      };
      ruleChain.push(step);
      return {
        command: cmdName,
        category,
        description: command.description,
        usage,
        dangerLevel,
        requiredDiscordPerm: command.requiredDiscordPerm,
        effectiveAccess: 'ALLOWED',
        hasOverride: false,
        reason: `Granted via @${policy.roleName} (Administrator profile).`,
        source: 'ROLE_PROFILE',
        matchedRule: `@${policy.roleName} → Administrator → Unrestricted`,
        matchedRole: policy.roleId,
        ruleChain,
      };
    }

    // Moderator profile grants moderation & community commands
    if (profileId === 'moderator' && (category === 'moderation' || category === 'community' || category === 'voice')) {
      const step: RuleChainStep = {
        step: '5. Role Policy Profile Mapping',
        result: 'ALLOW',
        detail: `Role @${policy.roleName} is assigned the 'Moderator' profile granting access to moderation/voice commands.`,
        source: 'ROLE_PROFILE',
        isWinningRule: true,
      };
      ruleChain.push(step);
      return {
        command: cmdName,
        category,
        description: command.description,
        usage,
        dangerLevel,
        requiredDiscordPerm: command.requiredDiscordPerm,
        effectiveAccess: 'ALLOWED',
        hasOverride: false,
        reason: `Granted via @${policy.roleName} (Moderator profile).`,
        source: 'ROLE_PROFILE',
        matchedRule: `@${policy.roleName} → Moderator → ${category}`,
        matchedRole: policy.roleId,
        ruleChain,
      };
    }

    // Economy Manager profile grants economy commands
    if (profileId === 'economy_manager' && category === 'economy') {
      const step: RuleChainStep = {
        step: '5. Role Policy Profile Mapping',
        result: 'ALLOW',
        detail: `Role @${policy.roleName} is assigned the 'Economy Manager' profile granting access to economy tools.`,
        source: 'ROLE_PROFILE',
        isWinningRule: true,
      };
      ruleChain.push(step);
      return {
        command: cmdName,
        category,
        description: command.description,
        usage,
        dangerLevel,
        requiredDiscordPerm: command.requiredDiscordPerm,
        effectiveAccess: 'ALLOWED',
        hasOverride: false,
        reason: `Granted via @${policy.roleName} (Economy Manager profile).`,
        source: 'ROLE_PROFILE',
        matchedRule: `@${policy.roleName} → Economy Manager → economy`,
        matchedRole: policy.roleId,
        ruleChain,
      };
    }

    // Viewer profile grants low risk general and basic economy commands (bal, daily, rw)
    if (profileId === 'viewer' && (cmdName === 'bal' || cmdName === 'daily' || cmdName === 'store' || cmdName === 'rw' || cmdName === 'vc')) {
      const step: RuleChainStep = {
        step: '5. Role Policy Profile Mapping',
        result: 'ALLOW',
        detail: `Role @${policy.roleName} is assigned the 'Viewer' profile granting access to standard member utility commands.`,
        source: 'ROLE_PROFILE',
        isWinningRule: true,
      };
      ruleChain.push(step);
      return {
        command: cmdName,
        category,
        description: command.description,
        usage,
        dangerLevel,
        requiredDiscordPerm: command.requiredDiscordPerm,
        effectiveAccess: 'ALLOWED',
        hasOverride: false,
        reason: `Granted via @${policy.roleName} (Viewer profile).`,
        source: 'ROLE_PROFILE',
        matchedRule: `@${policy.roleName} → Viewer → member utilities`,
        matchedRole: policy.roleId,
        ruleChain,
      };
    }
  }

  ruleChain.push({
    step: '5. Role Policy Profile Mapping',
    result: 'NEUTRAL',
    detail: 'No assigned role profile policy grants execution rights for this specific command.',
    source: 'ROLE_PROFILE',
  });

  // Step 6: Server Default Private Command Fallback
  const finalStep: RuleChainStep = {
    step: '6. Server Security Default',
    result: 'DENY',
    detail: 'Hawk operates under private permit security. Commands require an explicit role policy, custom permit, or public designation.',
    source: 'DEFAULT_DENY',
    isWinningRule: true,
  };
  ruleChain.push(finalStep);

  return {
    command: cmdName,
    category,
    description: command.description,
    usage,
    dangerLevel,
    requiredDiscordPerm: command.requiredDiscordPerm,
    effectiveAccess: 'DENIED',
    hasOverride: false,
    reason: 'Private command requires an explicit custom permit or role policy.',
    source: 'DEFAULT_DENY',
    matchedRule: 'Default Policy → Private Enforcement → DENY',
    ruleChain,
  };
}

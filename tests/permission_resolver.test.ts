import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveEffectiveCommandAccess,
  resolveEffectivePermission,
  DEFAULT_PRESET_PROFILES,
} from '../web/lib/permissions.js';

test('resolveEffectiveCommandAccess grants superadmin bypass', () => {
  const result = resolveEffectiveCommandAccess({
    command: {
      name: 'nuke',
      category: 'moderation',
      description: 'Nuke channel',
      dangerLevel: 'CRITICAL',
    },
    userId: '111111111111111111',
    userRoleIds: [],
    isOwnerOrAdmin: true,
    permits: [],
    commandAcls: [],
    rolePolicies: [],
  });

  assert.equal(result.effectiveAccess, 'ALLOWED');
  assert.equal(result.source, 'SUPERADMIN');
  assert.equal(result.ruleChain.length, 1);
  assert.equal(result.ruleChain[0].result, 'ALLOW');
});

test('resolveEffectiveCommandAccess grants global public commands unconditionally', () => {
  const result = resolveEffectiveCommandAccess({
    command: {
      name: 'help',
      category: 'general',
      description: 'Show help',
      dangerLevel: 'LOW',
    },
    userId: '999999999999999999',
    userRoleIds: ['role_guest'],
    isOwnerOrAdmin: false,
    permits: [],
    commandAcls: [],
    rolePolicies: [],
  });

  assert.equal(result.effectiveAccess, 'ALLOWED');
  assert.equal(result.source, 'PUBLIC_COMMAND');
  assert.ok(result.ruleChain.some((r) => r.isWinningRule && r.source === 'PUBLIC_COMMAND'));
});

test('resolveEffectiveCommandAccess honors explicit role ACL overrides', () => {
  const result = resolveEffectiveCommandAccess({
    command: {
      name: 'rp',
      category: 'voice',
      description: 'Rename private voice',
      dangerLevel: 'LOW',
    },
    userId: '123456789012345678',
    userRoleIds: ['role_game_host'],
    isOwnerOrAdmin: false,
    permits: [],
    commandAcls: [
      {
        command: 'rp',
        category: 'voice',
        description: 'Rename private voice',
        defaultRoleProfile: 'viewer',
        dangerLevel: 'LOW',
        roleOverrides: [{ roleId: 'role_game_host', effect: 'ALLOW' }],
        userOverrides: [],
      },
    ],
    rolePolicies: [],
  });

  assert.equal(result.effectiveAccess, 'ALLOWED');
  assert.equal(result.hasOverride, true);
  assert.equal(result.source, 'ROLE_OVERRIDE');
  assert.equal(result.matchedRole, 'role_game_host');
});

test('resolveEffectiveCommandAccess inherits role profile permissions', () => {
  const result = resolveEffectiveCommandAccess({
    command: {
      name: 'purge',
      category: 'moderation',
      description: 'Purge messages',
      dangerLevel: 'HIGH',
      requiredDiscordPerm: 'Manage Messages',
    },
    userId: '123456789012345678',
    userRoleIds: ['role_staff'],
    isOwnerOrAdmin: false,
    permits: [],
    commandAcls: [],
    rolePolicies: [
      {
        roleId: 'role_staff',
        roleName: 'Staff Moderator',
        profileId: 'moderator',
        memberCount: 5,
        status: 'active',
      },
    ],
  });

  assert.equal(result.effectiveAccess, 'ALLOWED');
  assert.equal(result.source, 'ROLE_PROFILE');
  assert.ok(result.reason.includes('Staff Moderator'));
});

test('resolveEffectiveCommandAccess denies private commands without policy or permit', () => {
  const result = resolveEffectiveCommandAccess({
    command: {
      name: 'ban',
      category: 'moderation',
      description: 'Ban member',
      dangerLevel: 'CRITICAL',
    },
    userId: '123456789012345678',
    userRoleIds: ['role_guest'],
    isOwnerOrAdmin: false,
    permits: [],
    commandAcls: [],
    rolePolicies: [],
  });

  assert.equal(result.effectiveAccess, 'DENIED');
  assert.equal(result.source, 'DEFAULT_DENY');
  assert.ok(result.ruleChain.some((r) => r.isWinningRule && r.source === 'DEFAULT_DENY'));
});

test('resolveEffectivePermission correctly checks module view and manage rights', () => {
  const allowed = resolveEffectivePermission({
    userId: '123456789012345678',
    userRoleIds: ['role_mod'],
    module: 'gaming',
    action: 'manage',
    isOwnerOrAdmin: false,
    profiles: DEFAULT_PRESET_PROFILES,
    rolePolicies: [
      {
        roleId: 'role_mod',
        roleName: 'Moderator',
        profileId: 'moderator',
        memberCount: 2,
        status: 'active',
      },
    ],
    userOverrides: [],
  });

  assert.equal(allowed.allowed, true);
  assert.equal(allowed.source, 'ROLE_POLICY');
});

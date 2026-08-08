import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveUser } from '../src/core/resolver/UserResolver.js';
import multimoveCmd from '../src/modules/voice/multimove.js';
import shiftvcCmd from '../src/modules/voice/shiftvc.js';
import mvCmd from '../src/modules/voice/mv.js';
import pingCmd from '../src/modules/general/ping.js';
import infoCmd from '../src/modules/general/info.js';

test('UserResolver strictly rejects non-snowflake and non-mention text input', async () => {
  const mockGuild = {} as any;
  const result = await resolveUser('john_doe', mockGuild);
  assert.equal(result.success, false);
  assert.match(result.error || '', /Invalid user format/);
});

test('UserResolver parses valid user mention or snowflake format', async () => {
  const mockGuild = {
    members: {
      fetch: async (id: string) => {
        if (id === '123456789012345678') {
          return {
            id,
            displayName: 'TestUser',
            nickname: null,
            user: { id, username: 'testuser', tag: 'testuser#0000' },
          };
        }
        throw new Error('Not found');
      },
    },
  } as any;

  const resultMention = await resolveUser('<@123456789012345678>', mockGuild);
  assert.equal(resultMention.success, true);
  if (resultMention.success) {
    assert.equal(resultMention.value.id, '123456789012345678');
  }

  const resultId = await resolveUser('123456789012345678', mockGuild);
  assert.equal(resultId.success, true);
  if (resultId.success) {
    assert.equal(resultId.value.id, '123456789012345678');
  }
});

test('Voice commands have correct requested aliases', () => {
  assert.ok(multimoveCmd.aliases.includes('mmv'), 'multimove command should have mmv alias');
  assert.ok(shiftvcCmd.aliases.includes('svc'), 'shiftvc command should have svc alias');
  assert.ok(mvCmd.aliases.includes('pull'), 'mv command should have pull alias');
});

test('Ping and Info commands exist with proper metadata', () => {
  assert.equal(pingCmd.name, 'ping');
  assert.ok(pingCmd.aliases.includes('latency'));

  assert.equal(infoCmd.name, 'info');
  assert.ok(infoCmd.aliases.includes('botinfo'));
});

test('AuthorityLevel correctly identifies multiple bot owners', async () => {
  const { getAuthorityLevel } = await import('../src/core/permissions/PermissionChecker.js');
  const { AuthorityLevel } = await import('../src/types/permission.js');
  const { env } = await import('../src/core/config/environment.js');

  assert.ok(env.botOwnerIds.includes('1021765669185925150'), '1021765669185925150 should be in botOwnerIds');
  assert.equal(getAuthorityLevel('1021765669185925150', '999'), AuthorityLevel.Owner);
});

test('RoleResolver resolves ?all and all directly to @everyone role without fuzzy search', async () => {
  const { resolveRole } = await import('../src/core/resolver/RoleResolver.js');
  const mockGuild = {
    id: 'guild_999',
    roles: {
      everyone: { id: 'guild_999', name: '@everyone' },
      cache: new Map([
        ['guild_999', { id: 'guild_999', name: '@everyone' }],
        ['role_111', { id: 'role_111', name: 'Alliance' }],
      ]),
    },
  } as any;

  const resQAll = resolveRole('?all', mockGuild);
  assert.equal(resQAll.success, true);
  if (resQAll.success) {
    assert.equal(resQAll.value.id, 'guild_999');
    assert.equal(resQAll.value.name, '@everyone');
  }

  const resAll = resolveRole('all', mockGuild);
  assert.equal(resAll.success, true);
  if (resAll.success) {
    assert.equal(resAll.value.id, 'guild_999');
    assert.equal(resAll.value.name, '@everyone');
  }
});

test('Moderation commands have memorable short aliases', async () => {
  const hideCmd = (await import('../src/modules/moderation/hide.js')).default;
  const unhideCmd = (await import('../src/modules/moderation/unhide.js')).default;
  const lockCmd = (await import('../src/modules/moderation/lock.js')).default;
  const unlockCmd = (await import('../src/modules/moderation/unlock.js')).default;
  const purgeCmd = (await import('../src/modules/moderation/purge.js')).default;
  const slowmodeCmd = (await import('../src/modules/moderation/slowmode.js')).default;
  const snipeCmd = (await import('../src/modules/moderation/snipe.js')).default;
  const roleCmd = (await import('../src/modules/moderation/role.js')).default;
  const uroleCmd = (await import('../src/modules/moderation/urole.js')).default;
  const vcmuteCmd = (await import('../src/modules/moderation/vcmute.js')).default;
  const vcslamCmd = (await import('../src/modules/moderation/vcslam.js')).default;

  assert.ok(hideCmd.aliases.includes('h'));
  assert.ok(unhideCmd.aliases.includes('unh'));
  assert.equal(unhideCmd.aliases.includes('uh'), false);
  assert.ok(lockCmd.aliases.includes('l'));
  assert.ok(unlockCmd.aliases.includes('ul'));
  assert.ok(purgeCmd.aliases.includes('c'));
  assert.ok(purgeCmd.aliases.includes('clear'));
  assert.ok(slowmodeCmd.aliases.includes('sm'));
  assert.ok(snipeCmd.aliases.includes('s'));
  assert.ok(roleCmd.aliases.includes('r'));
  assert.ok(uroleCmd.aliases.includes('ur'));
  assert.ok(vcmuteCmd.aliases.includes('vm'));
  assert.ok(vcslamCmd.aliases.includes('slam'));
});

test('Nuke command exists with proper metadata and aliases', async () => {
  const nukeCmd = (await import('../src/modules/moderation/nuke.js')).default;
  assert.equal(nukeCmd.name, 'nuke');
  assert.ok(nukeCmd.aliases.includes('clearall'));
  assert.ok(nukeCmd.aliases.includes('recreatechannel'));
});

test('rolein and roleall commands exist with proper metadata and usage', async () => {
  const roleinCmd = (await import('../src/modules/moderation/rolein.ts')).default;
  const roleallCmd = (await import('../src/modules/moderation/roleall.ts')).default;

  assert.equal(roleinCmd.name, 'rolein');
  assert.ok(roleinCmd.aliases.includes('rin'));
  assert.ok(roleinCmd.usage.includes('?rm'));

  assert.equal(roleallCmd.name, 'roleall');
  assert.ok(roleallCmd.aliases.includes('rall'));
  assert.ok(roleallCmd.usage.includes('?rm'));
});

test('addRoleToMember and removeRoleFromMember respect existing member roles', async () => {
  const { addRoleToMember, removeRoleFromMember } = await import('../src/modules/moderation/roleHelpers.ts');

  const mockRole = { id: 'role1', position: 10, managed: false } as any;
  const mockBot = { roles: { highest: { position: 100 } } } as any;

  let added = false;
  let removed = false;

  const mockMemberWithRole = {
    id: 'user1',
    roles: {
      cache: new Map([['role1', mockRole]]),
      highest: { position: 5 },
      add: async () => { added = true; },
      remove: async () => { removed = true; },
    },
  } as any;

  const mockMemberWithoutRole = {
    id: 'user2',
    roles: {
      cache: new Map(),
      highest: { position: 5 },
      add: async () => { added = true; },
      remove: async () => { removed = true; },
    },
  } as any;

  const mockGuild = {
    id: 'guild1',
    ownerId: 'owner1',
    members: { me: mockBot },
  } as any;

  // Adding role to member who already has it -> skipped
  const res1 = await addRoleToMember(mockGuild, mockMemberWithRole, mockRole);
  assert.equal(res1, 'skipped');

  // Adding role to member who does not have it -> added
  added = false;
  const res2 = await addRoleToMember(mockGuild, mockMemberWithoutRole, mockRole);
  assert.equal(res2, 'added');
  assert.equal(added, true);

  // Removing role from member who does not have it -> skipped
  const res3 = await removeRoleFromMember(mockGuild, mockMemberWithoutRole, mockRole);
  assert.equal(res3, 'skipped');

  // Removing role from member who has it -> removed
  removed = false;
  const res4 = await removeRoleFromMember(mockGuild, mockMemberWithRole, mockRole);
  assert.equal(res4, 'removed');
  assert.equal(removed, true);
});

test('move command supports multiple users and has updated usage metadata', async () => {
  const moveCmd = (await import('../src/modules/voice/move.ts')).default;
  assert.equal(moveCmd.name, 'move');
  assert.ok(moveCmd.usage.includes('<users...>'));
  assert.ok(moveCmd.description.includes('user or multiple users'));
});







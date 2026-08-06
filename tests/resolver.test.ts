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

test('Ship command calculates deterministic compatibility score and generates ship name', async () => {
  const { calculateCompatibility, generateShipName, getProgressBar, getRelationshipInfo } = await import('../src/modules/general/ship.js');
  const shipCmd = (await import('../src/modules/general/ship.js')).default;

  assert.equal(calculateCompatibility('123', '123'), 100);

  const score1 = calculateCompatibility('111', '222');
  const score2 = calculateCompatibility('222', '111');
  assert.equal(score1, score2, 'Compatibility should be symmetric and deterministic');
  assert.ok(score1 >= 0 && score1 <= 100);

  const shipName = generateShipName('Romeo', 'Juliet');
  assert.ok(typeof shipName === 'string' && shipName.length > 0);

  const bar = getProgressBar(80);
  assert.equal(bar.length, 10);

  const rel = getRelationshipInfo(95);
  assert.equal(rel.title, 'Match Made in Heaven');

  assert.equal(shipCmd.name, 'ship');
  assert.ok(shipCmd.aliases.includes('match'));
  assert.ok(shipCmd.aliases.includes('love'));
});





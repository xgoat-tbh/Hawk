import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDbClient, checkDbConnection, cleanupTestGuild, cleanSnowflake, cleanString, cleanInt, isValidSnowflake } from './e2e_helpers.js';
import { closeDb } from '../../src/core/database/pool.js';
import { resolveEffectiveCommandAccess, DEFAULT_PRESET_PROFILES } from '../../web/lib/permissions.js';
import { normalizeValue, isConfigEqual } from '../../web/hooks/useFormDraft.js';

test('E2E Tier 2: Boundary & Corner Cases (Limits, Overflows, Sanitization, Denials)', async (t) => {
  const isConnected = await checkDbConnection();
  if (!isConnected) {
    console.log('Skipping live DB tier 2 assertions (no active PostgreSQL connection)');
    return;
  }

  const db = createTestDbClient();
  const testGuildId = '999900000000000102';

  await cleanupTestGuild(db, testGuildId);

  try {
    // 1. Snowflake Validation & Boundary Tests
    await t.test('1. Snowflake Validation: Exact 17-20 Digit Boundaries & SQL Injection Protection', () => {
      // Valid Discord snowflakes
      assert.equal(isValidSnowflake('12345678901234567'), true, '17 digits must be valid');
      assert.equal(isValidSnowflake('123456789012345678'), true, '18 digits must be valid');
      assert.equal(isValidSnowflake('1234567890123456789'), true, '19 digits must be valid');
      assert.equal(isValidSnowflake('12345678901234567890'), true, '20 digits must be valid');

      // Invalid boundaries
      assert.equal(isValidSnowflake(''), false, 'Empty string must be invalid');
      assert.equal(isValidSnowflake('1234567890123456'), false, '16 digits (too short) must be invalid');
      assert.equal(isValidSnowflake('123456789012345678901'), false, '21 digits (too long) must be invalid');
      assert.equal(isValidSnowflake('12345678901234567a'), false, 'Non-digits must be invalid');
      assert.equal(isValidSnowflake('  123456789012345678  '), true, 'Leading/trailing whitespace should be trimmed');

      // Malicious payloads
      assert.equal(isValidSnowflake("' OR '1'='1"), false, 'SQL injection must be rejected');
      assert.equal(isValidSnowflake('12345678901234567; DROP TABLE users;'), false, 'Semicolon injection rejected');
      assert.equal(cleanSnowflake("' OR 1=1 --"), null, 'cleanSnowflake must return null for injection');
    });

    // 2. String Length Boundaries (Discord 2000-char message, 256-char title, 4096-char desc)
    await t.test('2. String Boundaries: Discord 2000-Char Message, Prefix Max 5, Embed Limits', () => {
      // Prefix max length: 5
      const longPrefix = '!!!!!!!';
      const cleanPref = cleanString(longPrefix, 5);
      assert.equal(cleanPref.length, 5);
      assert.equal(cleanPref, '!!!!!');

      // Sticky message limit: 2000 chars
      const text2500 = 'A'.repeat(2500);
      const textCapped = cleanString(text2500, 2000);
      assert.equal(textCapped.length, 2000);

      // Embed title limit: 256 chars
      const titleCapped = cleanString(text2500, 256);
      assert.equal(titleCapped.length, 256);

      // Embed description limit: 4096 chars
      const text5000 = 'D'.repeat(5000);
      const descCapped = cleanString(text5000, 4096);
      assert.equal(descCapped.length, 4096);
    });

    // 3. Numeric Invariants: Clamping Negative Balances & Floating-Point Sanitization
    await t.test('3. Numeric Boundaries: Clamping Negative Balances & NaN Fallbacks', () => {
      // Clamping negative balance
      const negativeBalance = cleanInt(-500, 0, 1_000_000_000, 0);
      assert.equal(negativeBalance, 0, 'Negative balance must clamp to 0');

      // NaN fallback
      const nanValue = cleanInt('not_a_number', 0, 1_000_000_000, 100);
      assert.equal(nanValue, 100, 'NaN must fallback to default value');

      // Overflow clamp
      const overflowValue = cleanInt(999_999_999_999, 0, 1_000_000_000, 0);
      assert.equal(overflowValue, 1_000_000_000, 'Values above max must clamp to max');

      // Scientific notation string parser test (used in store items)
      const sciNotationPrice = '1.5e5';
      const parsedSci = Math.floor(Number(sciNotationPrice));
      assert.equal(parsedSci, 150000, 'Scientific notation strings must be parsed without losing magnitude');
    });

    // 4. Safe BigInt Amount Precision (Avoiding 32-bit truncation bitwise bugs)
    await t.test('4. Safe Number Parsing: BigInt Precision Without 32-Bit Truncation', () => {
      // Invariant: NEVER use 32-bit bitwise operators (| 0, ~~n) for user currency
      const largeAmount = 5_000_000_000; // Exceeds 32-bit signed int max (2,147,483,647)
      const bitwiseTruncated = largeAmount | 0; // BUGGY: becomes 705032704
      assert.notEqual(largeAmount, bitwiseTruncated, 'Bitwise truncate alters numbers > 2^31');

      // Safe representation using BigInt / string expansion
      const safeExpanded = BigInt(largeAmount).toString();
      assert.equal(safeExpanded, '5000000000', 'BigInt preserves exact numeric fidelity');
    });

    // 5. PVC Voice Limit Boundaries (0 to 99)
    await t.test('5. PVC Boundaries: User Limit Clamped to Discord Allowed Range [0, 99]', () => {
      const clampUserLimit = (val: unknown) => {
        const parsed = parseInt(String(val), 10);
        if (isNaN(parsed)) return 0;
        return Math.max(0, Math.min(99, parsed));
      };

      assert.equal(clampUserLimit(-5), 0);
      assert.equal(clampUserLimit(0), 0);
      assert.equal(clampUserLimit(5), 5);
      assert.equal(clampUserLimit(99), 99);
      assert.equal(clampUserLimit(150), 99);
      assert.equal(clampUserLimit('invalid'), 0);
    });

    // 6. Form Draft Normalization & Dirty Detection on Extreme Corner Cases
    await t.test('6. Form Draft System: Corner Cases (Undefined, Nested Nulls, Whitespace)', () => {
      const raw = {
        a: undefined,
        b: '   trimmed text   ',
        c: null,
        d: { nested: undefined, val: ' hello ' },
      };

      const normalized = normalizeValue(raw);
      assert.deepEqual(normalized, {
        a: null,
        b: '   trimmed text   ',
        c: null,
        d: { nested: null, val: ' hello ' },
      });

      // Equivalent objects with different key orders
      const objA = { z: 1, a: 'test', m: [1, 2] };
      const objB = { a: 'test', m: [1, 2], z: 1 };
      assert.equal(isConfigEqual(objA, objB), true);

      // Deep change detection
      const objC = { a: 'test', m: [1, 3], z: 1 };
      assert.equal(isConfigEqual(objA, objC), false);
    });

    // 7. Permission Denials & Authorization Gates
    await t.test('7. Permission Denials: Explicit User Override DENY Overrides Role Profile ALLOW', () => {
      const normalRoleId = '999900000000000302';
      const targetUserId = '999900000000000402';

      // User has role with Moderator profile, but an explicit user ACL DENY override
      const verdict = resolveEffectiveCommandAccess({
        command: {
          name: 'kick',
          category: 'moderation',
          description: 'Kick member',
          dangerLevel: 'HIGH',
          requiredDiscordPerm: 'Kick Members',
        },
        userId: targetUserId,
        userRoleIds: [normalRoleId],
        isOwnerOrAdmin: false,
        permits: [],
        commandAcls: [
          {
            command: 'kick',
            category: 'moderation',
            description: 'Kick member',
            defaultRoleProfile: 'moderator',
            dangerLevel: 'HIGH',
            roleOverrides: [],
            userOverrides: [{ userId: targetUserId, effect: 'DENY' }],
          },
        ],
        rolePolicies: [
          {
            roleId: normalRoleId,
            roleName: 'Moderator',
            profileId: 'moderator',
            memberCount: 1,
            status: 'active',
          },
        ],
      });

      assert.equal(verdict.effectiveAccess, 'DENIED', 'Explicit user override DENY must win over role profile');
      assert.equal(verdict.source, 'USER_OVERRIDE');
    });

    // 8. Database Constraint Corner Cases: Duplicate Key & Clean Upsert
    await t.test('8. Database Constraints: ON CONFLICT Upsert Prevents Duplicate Rows', async () => {
      // Insert duplicate guild_config
      await db`
        INSERT INTO guild_config (guild_id, prefix)
        VALUES (${testGuildId}, '!')
        ON CONFLICT (guild_id) DO UPDATE SET prefix = '!'
      `;

      await db`
        INSERT INTO guild_config (guild_id, prefix)
        VALUES (${testGuildId}, '?')
        ON CONFLICT (guild_id) DO UPDATE SET prefix = '?'
      `;

      const rows = await db`SELECT * FROM guild_config WHERE guild_id = ${testGuildId}`;
      assert.equal(rows.length, 1, 'Exactly one row must exist after upsert conflict');
      assert.equal(rows[0].prefix, '?');
    });

  } finally {
    await cleanupTestGuild(db, testGuildId);
    await db.end().catch(() => {});
    await closeDb().catch(() => {});
  }
});

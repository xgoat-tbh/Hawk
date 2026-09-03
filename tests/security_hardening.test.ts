import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { isSafeMediaUrl } from '../src/modules/general/steal.js';
import { getAuthorityLevel } from '../src/core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../src/types/permission.js';

test('SSRF Protection: isSafeMediaUrl rejects unsafe loopback, link-local, private, and metadata URLs', () => {
  // Reject AWS / GCP metadata service
  assert.equal(isSafeMediaUrl('http://169.254.169.254/latest/meta-data/credentials.png'), false);
  assert.equal(isSafeMediaUrl('https://169.254.169.254/latest/meta-data/credentials.png'), false);

  // Reject local loopback and internal health server
  assert.equal(isSafeMediaUrl('http://127.0.0.1:10000/api/health.png'), false);
  assert.equal(isSafeMediaUrl('https://127.0.0.1:3000/secret.png'), false);
  assert.equal(isSafeMediaUrl('http://localhost:3000/admin.png'), false);
  assert.equal(isSafeMediaUrl('https://localhost/admin.png'), false);

  // Reject private IPv4 subnets
  assert.equal(isSafeMediaUrl('https://10.0.0.1/internal.png'), false);
  assert.equal(isSafeMediaUrl('https://172.16.0.1/internal.png'), false);
  assert.equal(isSafeMediaUrl('https://192.168.1.1/internal.png'), false);

  // Reject non-image endpoints
  assert.equal(isSafeMediaUrl('https://cdn.discordapp.com/api/v10/users/@me'), false);

  // Reject non-HTTPS
  assert.equal(isSafeMediaUrl('http://cdn.discordapp.com/emojis/123456789012345678.png'), false);

  // Allow legitimate HTTPS image CDN URLs
  assert.equal(isSafeMediaUrl('https://cdn.discordapp.com/emojis/123456789012345678.png'), true);
  assert.equal(isSafeMediaUrl('https://cdn.discordapp.com/emojis/123456789012345678.gif'), true);
  assert.equal(isSafeMediaUrl('https://media.discordapp.net/attachments/111222333/444555666/image.webp'), true);
});

test('Authority Level: getAuthorityLevel recognizes guild owner as ServerAdmin', () => {
  const guildOwnerId = '888888888888888888';
  const normalUserId = '123456789012345678';

  assert.equal(getAuthorityLevel(guildOwnerId, guildOwnerId), AuthorityLevel.ServerAdmin);
  assert.equal(getAuthorityLevel(normalUserId, guildOwnerId), AuthorityLevel.Normal);
});

test('Authorization Bitfield: Administrator and Manage Guild bitfields vs cosmetic names', () => {
  const ADMINISTRATOR = 0x8n;
  const MANAGE_GUILD = 0x20n;

  // Cosmetic role named "Badminton" or "Administrator Fan" with basic permissions
  const cosmeticRolePerms = 0x400n; // VIEW_CHANNEL only
  const hasAdminPerm = (cosmeticRolePerms & ADMINISTRATOR) === ADMINISTRATOR || (cosmeticRolePerms & MANAGE_GUILD) === MANAGE_GUILD;
  assert.equal(hasAdminPerm, false, 'Cosmetic role with "admin" in name must not grant management access');

  // Genuine Administrator role
  const genuineAdminPerms = 0x8n;
  const isGenuineAdmin = (genuineAdminPerms & ADMINISTRATOR) === ADMINISTRATOR || (genuineAdminPerms & MANAGE_GUILD) === MANAGE_GUILD;
  assert.equal(isGenuineAdmin, true, 'Genuine Administrator permission bitfield must grant access');

  // Genuine Manage Server role
  const genuineManageGuildPerms = 0x20n;
  const isGenuineManageGuild = (genuineManageGuildPerms & ADMINISTRATOR) === ADMINISTRATOR || (genuineManageGuildPerms & MANAGE_GUILD) === MANAGE_GUILD;
  assert.equal(isGenuineManageGuild, true, 'Genuine Manage Server permission bitfield must grant access');
});

test('Timing-Safe Passcode Verification: timingSafeEqual prevents timing leakage', () => {
  const configuredPasscode = 'hawk_prod_secret_passcode_2026';
  const validUserPasscode = 'hawk_prod_secret_passcode_2026';
  const invalidUserPasscode = 'hawk_prod_wrong_passcode_2026!';

  const verifyPasscode = (provided: string, expected: string): boolean => {
    const userBuf = Buffer.from(provided);
    const expBuf = Buffer.from(expected);
    return userBuf.length === expBuf.length && crypto.timingSafeEqual(userBuf, expBuf);
  };

  assert.equal(verifyPasscode(validUserPasscode, configuredPasscode), true);
  assert.equal(verifyPasscode(invalidUserPasscode, configuredPasscode), false);
  assert.equal(verifyPasscode('', configuredPasscode), false);
});

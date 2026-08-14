import { describe, it, expect } from 'vitest';
import { getUsableCommandsForMember, checkPermission, getAuthorityLevel } from '../src/core/permissions/PermissionChecker.js';
import { registerCommand } from '../src/core/commands/CommandRegistry.js';
import { defineCommand } from '../src/types/command.js';
import { PermissionsBitField } from 'discord.js';

describe('PermissionChecker Private Owner & Custom Permit Only Model', () => {
  it('denies commands by default to normal members without permits', async () => {
    registerCommand(defineCommand({
      name: 'wv',
      module: 'voice',
      description: 'Check which voice channel a user is in',
      permissions: [],
      execute: async () => {},
    }));

    const normalMember = {
      id: '123456789012345678',
      guild: {
        id: '987654321098765432',
        ownerId: '999999999999999999',
      },
      roles: {
        cache: new Map(),
      },
      permissions: new PermissionsBitField([]),
    } as any;

    const mockChannel = {
      id: '111222333444555666',
      parentId: null,
    } as any;

    const res = await getUsableCommandsForMember(normalMember, mockChannel);
    expect(res.usableCount).toBe(0);
    expect(res.usableSet.has('wv')).toBe(false);
  });

  it('allows commands to server owner', async () => {
    const ownerMember = {
      id: '999999999999999999',
      guild: {
        id: '987654321098765432',
        ownerId: '999999999999999999',
      },
      roles: {
        cache: new Map(),
      },
      permissions: new PermissionsBitField([PermissionsBitField.Flags.Administrator]),
    } as any;

    const mockChannel = {
      id: '111222333444555666',
      parentId: null,
    } as any;

    const res = await getUsableCommandsForMember(ownerMember, mockChannel);
    expect(res.usableCount).toBeGreaterThan(0);
    expect(res.usableSet.has('wv')).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { getUsableCommandsForMember } from '../src/core/permissions/PermissionChecker.js';
import { registerCommand } from '../src/core/commands/CommandRegistry.js';
import { defineCommand } from '../src/types/command.js';
import { PermissionsBitField } from 'discord.js';

describe('PermissionChecker Centralized Evaluator', () => {
  it('evaluates usable commands for a member', async () => {
    registerCommand(defineCommand({
      name: 'testping',
      module: 'general',
      description: 'Test ping command',
      execute: async () => {},
    }));

    const mockMember = {
      id: '123456789012345678',
      guild: {
        id: '987654321098765432',
        ownerId: '987654321098765432',
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

    const res = await getUsableCommandsForMember(mockMember, mockChannel);
    expect(res.totalCount).toBeGreaterThan(0);
    expect(res.usableCount).toBeGreaterThan(0);
    expect(res.usableSet).toBeInstanceOf(Set);
    expect(res.usableSet.has('testping')).toBe(true);
  });
});

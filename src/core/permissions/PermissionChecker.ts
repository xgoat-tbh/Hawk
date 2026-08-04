import { PermissionsBitField } from 'discord.js';
import type { GuildMember, PermissionResolvable } from 'discord.js';
import type { CommandDefinition } from '../../types/command.js';
import type { PermissionCheckResult, PermissionContext } from '../../types/permission.js';
import { AuthorityLevel } from '../../types/permission.js';
import { env } from '../config/environment.js';
import * as permissionRepo from '../database/repositories/permissionRepo.js';

export function getAuthorityLevel(userId: string, guildOwnerId: string): AuthorityLevel {
  if (userId === env.botOwnerId) return AuthorityLevel.Owner;
  if (env.botAdminIds.includes(userId)) return AuthorityLevel.BotAdmin;
  if (userId === guildOwnerId) return AuthorityLevel.ServerAdmin;
  return AuthorityLevel.Normal;
}

export async function checkPermission(
  command: CommandDefinition,
  ctx: PermissionContext,
  member: GuildMember,
): Promise<PermissionCheckResult> {
  const authority = getAuthorityLevel(ctx.userId, ctx.guildOwnerId);

  // 1. Owner-only command check
  if (command.ownerOnly) {
    if (authority === AuthorityLevel.Owner) {
      return { allowed: true, authority, reason: 'Bot owner bypass' };
    }
    return { allowed: false, authority, reason: 'This command is owner-only.' };
  }

  // 2. BotAdmin-only command check
  if (command.botAdminOnly) {
    if (authority === AuthorityLevel.Owner || authority === AuthorityLevel.BotAdmin) {
      return { allowed: true, authority, reason: 'Bot admin bypass' };
    }
    return { allowed: false, authority, reason: 'This command is restricted to bot administrators.' };
  }

  // 3. Normal command authority bypasses
  if (authority === AuthorityLevel.Owner) return { allowed: true, authority, reason: 'Bot owner bypass' };
  if (authority === AuthorityLevel.BotAdmin) return { allowed: true, authority, reason: 'Bot admin bypass' };
  if (authority === AuthorityLevel.ServerAdmin) return { allowed: true, authority, reason: 'Server owner bypass' };

  // 4. Custom permits (granted via ?access / ?permit)
  const hasCustomPermit = await permissionRepo.hasPermit(ctx.guildId, ctx.userId, ctx.memberRoleIds, ctx.commandName, ctx.moduleName);
  if (hasCustomPermit) return { allowed: true, authority: AuthorityLevel.Permitted, reason: 'Custom permit granted' };

  // 5. Native Discord permissions required by command
  if (command.permissions.length > 0) {
    const hasNative = command.permissions.every((perm) => member.permissions.has(perm));
    if (hasNative) return { allowed: true, authority: AuthorityLevel.Normal, reason: 'Native Discord permission' };
    return { allowed: false, authority, reason: 'You do not have permission to use this command.' };
  }

  // 6. Permit-only flag
  if (command.permitOnly) {
    return { allowed: false, authority, reason: 'You do not have permission to use this command.' };
  }

  // 7. Staff-only bot policy for public commands
  const isStaff = member.permissions.has(PermissionsBitField.Flags.Administrator)
    || member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    || member.permissions.has(PermissionsBitField.Flags.ManageRoles)
    || member.permissions.has(PermissionsBitField.Flags.ManageChannels)
    || member.permissions.has(PermissionsBitField.Flags.ManageMessages)
    || member.permissions.has(PermissionsBitField.Flags.MoveMembers)
    || member.permissions.has(PermissionsBitField.Flags.ModerateMembers)
    || member.permissions.has(PermissionsBitField.Flags.BanMembers)
    || member.permissions.has(PermissionsBitField.Flags.KickMembers);

  if (isStaff) {
    return { allowed: true, authority: AuthorityLevel.Normal, reason: 'Staff member access' };
  }

  return { allowed: false, authority, reason: 'This bot is restricted to staff members. Access can be granted via custom permits.' };
}

export function checkBotPermissions(botMember: GuildMember, required: PermissionResolvable[]): { hasAll: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const perm of required) {
    if (!botMember.permissions.has(perm)) missing.push(String(perm));
  }
  return { hasAll: missing.length === 0, missing };
}

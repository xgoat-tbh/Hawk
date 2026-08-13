import { PermissionsBitField } from 'discord.js';
import type { GuildMember, PermissionResolvable } from 'discord.js';
import type { CommandDefinition } from '../../types/command.js';
import type { PermissionCheckResult, PermissionContext } from '../../types/permission.js';
import { AuthorityLevel } from '../../types/permission.js';
import { env } from '../config/environment.js';
import * as permissionRepo from '../database/repositories/permissionRepo.js';

export function getAuthorityLevel(userId: string, guildOwnerId: string): AuthorityLevel {
  if (env.botOwnerIds.includes(userId) || userId === env.botOwnerId) return AuthorityLevel.Owner;
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

  if (command.ownerOnly) {
    const isOwner = authority === AuthorityLevel.Owner;
    return { allowed: isOwner, authority, reason: isOwner ? 'Bot owner bypass' : 'This command is owner-only.' };
  }

  if (command.botAdminOnly) {
    const isBotAdmin = authority >= AuthorityLevel.BotAdmin;
    return { allowed: isBotAdmin, authority, reason: isBotAdmin ? 'Bot admin bypass' : 'This command is restricted to bot administrators.' };
  }

  if (authority >= AuthorityLevel.ServerAdmin) {
    return { allowed: true, authority, reason: 'Authority bypass' };
  }

  const hasCustomPermit = await permissionRepo.hasPermit(ctx.guildId, ctx.userId, ctx.memberRoleIds, ctx.commandName, ctx.moduleName);
  if (hasCustomPermit) {
    return { allowed: true, authority: AuthorityLevel.Permitted, reason: 'Custom permit granted' };
  }

  if (command.permissions.length > 0) {
    const hasNative = command.permissions.every((perm) => member.permissions.has(perm));
    return { allowed: hasNative, authority, reason: hasNative ? 'Native Discord permission' : 'You do not have permission to use this command.' };
  }

  if (command.permitOnly) {
    return { allowed: false, authority, reason: 'You do not have permission to use this command.' };
  }

  const STAFF_PERMS =
    PermissionsBitField.Flags.Administrator |
    PermissionsBitField.Flags.ManageGuild |
    PermissionsBitField.Flags.ManageRoles |
    PermissionsBitField.Flags.ManageChannels |
    PermissionsBitField.Flags.ManageMessages |
    PermissionsBitField.Flags.MoveMembers |
    PermissionsBitField.Flags.ModerateMembers |
    PermissionsBitField.Flags.BanMembers |
    PermissionsBitField.Flags.KickMembers;

  const isStaff = member.permissions.has(STAFF_PERMS);
  if (isStaff) {
    return { allowed: true, authority: AuthorityLevel.Normal, reason: 'Staff member access' };
  }

  return { allowed: false, authority, reason: 'This bot is restricted to staff members. Access can be granted via custom permits.' };
}

export function checkBotPermissions(botMember: GuildMember, required: PermissionResolvable[]): { hasAll: boolean; missing: string[] } {
  const missing = required.filter((perm) => !botMember.permissions.has(perm)).map(String);
  return { hasAll: missing.length === 0, missing };
}

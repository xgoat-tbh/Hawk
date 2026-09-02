import { AuthorityLevel } from '../../types/permission.js';
import { env } from '../config/environment.js';
import * as permissionRepo from '../database/repositories/permissionRepo.js';
export function getAuthorityLevel(userId, _guildOwnerId) {
    if (env.botOwnerIds.includes(userId) || userId === env.botOwnerId)
        return AuthorityLevel.Owner;
    if (env.botAdminIds.includes(userId))
        return AuthorityLevel.BotAdmin;
    return AuthorityLevel.Normal;
}
export async function checkPermission(command, ctx, _member) {
    const authority = getAuthorityLevel(ctx.userId, ctx.guildOwnerId);
    if (command.ownerOnly || command.module === 'owner') {
        const isOwner = authority === AuthorityLevel.Owner;
        return { allowed: isOwner, authority, reason: isOwner ? 'Bot owner bypass' : 'This command is owner-only.' };
    }
    if (command.botAdminOnly) {
        const isBotAdmin = authority >= AuthorityLevel.BotAdmin;
        return { allowed: isBotAdmin, authority, reason: isBotAdmin ? 'Bot admin bypass' : 'This command is restricted to bot administrators.' };
    }
    if (authority === AuthorityLevel.Owner) {
        return { allowed: true, authority, reason: 'Bot owner bypass' };
    }
    if (['help', 'afk', 'ping', 'info'].includes(command.name)) {
        return { allowed: true, authority: AuthorityLevel.Normal, reason: 'Global public command' };
    }
    const hasCustomPermit = await permissionRepo.hasPermit(ctx.guildId, ctx.userId, ctx.memberRoleIds, ctx.commandName, ctx.moduleName);
    if (hasCustomPermit) {
        return { allowed: true, authority: AuthorityLevel.Permitted, reason: 'Custom access override granted' };
    }
    const revocation = await permissionRepo.getLatestRevocation(ctx.guildId, ctx.userId, ctx.memberRoleIds, ctx.commandName, ctx.moduleName);
    return {
        allowed: false,
        authority,
        reason: 'This bot is private. Commands require a custom permit granted by the owner.',
        revocationInfo: revocation ?? undefined,
    };
}
export function checkBotPermissions(botMember, required) {
    const missing = required.filter((perm) => !botMember.permissions.has(perm)).map(String);
    return { hasAll: missing.length === 0, missing };
}
export async function getUsableCommandsForMember(member, channel) {
    const { getAllCommands } = await import('../commands/CommandRegistry.js');
    const { checkRestrictions } = await import('../restrictions/RestrictionChecker.js');
    const { isIgnored } = await import('../ignore/IgnoreChecker.js');
    const guild = member.guild;
    const authority = getAuthorityLevel(member.id, guild.ownerId);
    const isOwner = authority === AuthorityLevel.Owner;
    const allCommands = getAllCommands(isOwner);
    const categoryId = ('parentId' in channel && channel.parentId) ? channel.parentId : null;
    const roleIds = Array.from(member.roles.cache.keys());
    const usableCommands = [];
    for (const cmd of allCommands) {
        if (!cmd.enabled)
            continue;
        const permCtx = {
            userId: member.id,
            guildId: guild.id,
            guildOwnerId: guild.ownerId,
            memberRoleIds: roleIds,
            commandName: cmd.name,
            moduleName: cmd.module,
            channelId: channel.id,
            categoryId,
        };
        if (authority < AuthorityLevel.ServerAdmin) {
            const ignored = await isIgnored(guild.id, member.id, roleIds, channel.id, categoryId, cmd.name, cmd.module, member.roles.cache);
            if (ignored)
                continue;
        }
        const permResult = await checkPermission(cmd, permCtx, member);
        if (!permResult.allowed)
            continue;
        const restrictResult = await checkRestrictions(permCtx, permResult.authority);
        if (!restrictResult.allowed)
            continue;
        usableCommands.push(cmd);
    }
    const usableSet = new Set(usableCommands.map(c => c.name));
    return {
        allCommands,
        usableCommands,
        usableSet,
        totalCount: allCommands.length,
        usableCount: usableCommands.length,
    };
}
//# sourceMappingURL=PermissionChecker.js.map
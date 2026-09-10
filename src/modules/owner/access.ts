import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { resolveCommand, getModules } from '../../core/commands/CommandRegistry.js';
import {
  addPermit,
  removePermit,
  getPermitsForGuild,
  deletePermitsByIds,
} from '../../core/database/repositories/permissionRepo.js';
import {
  grantDashboardAccess,
  revokeDashboardAccess,
} from '../../core/database/repositories/dashboardAccessRepo.js';
import { mentionUser, mentionRole } from '../../core/utils/formatters.js';
import { sanitize } from '../../core/utils/validators.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';
import { buildAccessListPayload } from './_accessHandler.js';

export default defineCommand({
  name: 'access',
  aliases: ['permit'],
  module: 'owner',
  description: 'Manage custom command & module permits (list, add, remove, fix) for users or roles.',
  usage: 'access list | access fix | access add <target> <command|module|all> | access remove <target> <command|module|all>',
  examples: [
    'access list',
    'access fix',
    'access add @User wv',
    'access add @Role voice',
    'access add ?all voice',
    'access add @User all',
    'access remove @User wv',
  ],
  ownerOnly: true,
  permissions: [],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;
    const authority = getAuthorityLevel(member.id, guild.ownerId);
    if (authority !== AuthorityLevel.Owner) {
      await respond.error('Only **Bot Owners** can manage command access and permits.');
      return;
    }

    if (parsed.args.length === 0) {
      await respond.error('Usage: `access list` | `access fix` | `access add <@user|@role|?all> <scope>` | `access remove <@user|@role|?all> <scope>`');
      return;
    }

    const firstArg = parsed.args[0].toLowerCase();

    // ── Subcommand: fix / clean / prune (Ghost Permit Cleanup) ──
    if (firstArg === 'fix' || firstArg === 'clean' || firstArg === 'prune') {
      const permits = await getPermitsForGuild(guild.id);
      if (permits.length === 0) {
        await respond.info('No permits exist in this server to clean.');
        return;
      }

      const availableModules = getModules();
      const ghostIds: number[] = [];
      let invalidCmdCount = 0;
      let deletedRoleCount = 0;
      let invalidModCount = 0;

      for (const p of permits) {
        let isGhost = false;

        // Check if target role was deleted
        if (p.targetType === 'role') {
          if (!guild.roles.cache.has(p.targetId)) {
            isGhost = true;
            deletedRoleCount++;
          }
        }

        // Check if command no longer exists in bot
        if (!isGhost && p.commandName) {
          const cmd = resolveCommand(p.commandName);
          if (!cmd) {
            isGhost = true;
            invalidCmdCount++;
          }
        }

        // Check if module no longer exists
        if (!isGhost && p.moduleName) {
          if (!availableModules.includes(p.moduleName.toLowerCase())) {
            isGhost = true;
            invalidModCount++;
          }
        }

        if (isGhost) {
          ghostIds.push(p.id);
        }
      }

      if (ghostIds.length === 0) {
        await respond.success('All active permits are clean and valid. No ghost permits found.');
        return;
      }

      const deletedCount = await deletePermitsByIds(guild.id, ghostIds);

      const summary = `Cleaned **${deletedCount}** ghost permit(s) [Invalid commands: **${invalidCmdCount}** | Deleted roles: **${deletedRoleCount}** | Invalid modules: **${invalidModCount}**].`;
      await respond.transientSuccess(summary, 8000);

      logAuditAction({
        guild,
        action: 'Access Ghost Permits Cleaned',
        executor: member,
        details: [
          `• **Total Removed:** ${deletedCount}`,
          `• **Non-existent Commands:** ${invalidCmdCount}`,
          `• **Deleted Roles:** ${deletedRoleCount}`,
          `• **Invalid Modules:** ${invalidModCount}`,
        ],
      });

      logEvent('info', 'command_execution', `Ghost permits fixed by ${member.user.tag}`, {
        executor: member.user.tag,
        guild: guild.name,
        cleanedCount: deletedCount,
        invalidCmdCount,
        deletedRoleCount,
        invalidModCount,
      });
      return;
    }

    // ── Subcommand: list ──────────────────────────────────────
    if (firstArg === 'list' || firstArg === 'show') {
      const listData = await buildAccessListPayload(guild, 0);
      if (!listData) {
        await respond.info('No custom permits have been granted in this server.');
        return;
      }

      await respond.raw({
        components: listData.components,
        flags: listData.payload.flags as any,
      });
      return;
    }

    // ── Subcommand: remove / revoke / delete ──────────────────
    let isRemoveMode = false;
    let targetIndex = 0;

    if (firstArg === 'remove' || firstArg === 'revoke' || firstArg === 'delete') {
      isRemoveMode = true;
      targetIndex = 1;
    } else if (firstArg === 'add' || firstArg === 'grant') {
      targetIndex = 1;
    }

    const remainingArgs = parsed.args.slice(targetIndex);
    if (remainingArgs.length < 2) {
      await respond.error(
        `Usage: \`access ${isRemoveMode ? 'remove' : 'add'} <@user|@role> <command|module|all>\``,
      );
      return;
    }

    const targetArg = remainingArgs[0];
    const scopeArg = remainingArgs.slice(1).join(' ').trim().toLowerCase();

    // 1. Resolve target (user or role)
    let targetType: 'user' | 'role';
    let targetId: string;
    let targetDisplay: string;

    const userResult = await resolveUser(targetArg, guild);
    if (userResult.success) {
      targetType = 'user';
      targetId = userResult.value.id;
      targetDisplay = mentionUser(userResult.value.member ?? userResult.value.user, guild);
    } else {
      const roleResult = resolveRole(targetArg, guild);
      if (roleResult.success) {
        targetType = 'role';
        targetId = roleResult.value.id;
        targetDisplay = mentionRole(roleResult.value.role, guild);
      } else {
        await respond.error(`Could not resolve user or role \`${targetArg}\`.`);
        return;
      }
    }

    // 2. Parse scope (dashboard, all, module:name, or command/module name)
    let commandName: string | null = null;
    let moduleName: string | null = null;

    if (scopeArg === 'dashboard' || scopeArg === 'dash') {
      if (targetType !== 'user') {
        await respond.error('Dashboard access can only be granted to specific users, not roles.');
        return;
      }

      if (isRemoveMode) {
        const revoked = await revokeDashboardAccess(targetId);
        if (revoked) {
          await respond.success(`Revoked ${targetDisplay}'s private Dashboard access.`);
        } else {
          await respond.info(`User ${targetDisplay} did not have active Dashboard access.`);
        }
      } else {
        await grantDashboardAccess(targetId, member.id, 'Granted via Discord access command');
        await respond.success(`Granted ${targetDisplay} private Dashboard access. They can now log in using their Discord User ID!`);
      }
      return;
    }

    if (scopeArg === 'all' || scopeArg === '*') {
      commandName = null;
      moduleName = null;
    } else if (scopeArg.startsWith('module:')) {
      const modName = scopeArg.slice(7).trim().toLowerCase();
      if (modName === 'owner' && !isRemoveMode) {
        await respond.error('The **owner** module cannot be permitted or distributed to any user or role.');
        return;
      }
      const allModules = getModules();
      if (!allModules.includes(modName)) {
        await respond.error(`Unknown module \`${modName}\`. Available modules: ${allModules.join(', ')}`);
        return;
      }
      moduleName = modName;
    } else {
      const cmd = resolveCommand(scopeArg);
      if (cmd) {
        if ((cmd.module === 'owner' || cmd.ownerOnly) && !isRemoveMode) {
          await respond.error(`Owner command \`${cmd.name}\` cannot be permitted or distributed to any user or role.`);
          return;
        }
        commandName = cmd.name;
        moduleName = cmd.module;
      } else {
        const allModules = getModules();
        if (allModules.includes(scopeArg)) {
          if (scopeArg === 'owner' && !isRemoveMode) {
            await respond.error('The **owner** module cannot be permitted or distributed to any user or role.');
            return;
          }
          moduleName = scopeArg;
        } else {
          await respond.error(`Unknown command or module \`${scopeArg}\`.`);
          return;
        }
      }
    }

    const scopeDisplay = commandName
      ? `command **${commandName}**`
      : moduleName
      ? `module **${moduleName}**`
      : '**ALL commands & modules**';

    // 3. Execute add or remove
    if (isRemoveMode) {
      const sanitizedStaffName = sanitize(member.displayName || member.user.tag);
      const removed = await removePermit(guild.id, targetType, targetId, commandName, moduleName, member.id, sanitizedStaffName);
      if (removed) {
        await respond.success(`Revoked ${targetDisplay} access to ${scopeDisplay}.`);
        logEvent('info', 'command_execution', `Permit removed by ${member.user.tag}`, {
          executor: member.user.tag,
          target: targetId,
          targetType,
          commandName,
          moduleName,
          guild: guild.name,
        });
      } else {
        await respond.info(`No active permit was found for ${targetDisplay} on ${scopeDisplay}.`);
      }
    } else {
      await addPermit(guild.id, targetType, targetId, commandName, moduleName);
      await respond.success(`Granted ${targetDisplay} access to ${scopeDisplay}.`);
      logEvent('info', 'command_execution', `Permit granted by ${member.user.tag}`, {
        executor: member.user.tag,
        target: targetId,
        targetType,
        commandName,
        moduleName,
        guild: guild.name,
      });
    }
  },
});

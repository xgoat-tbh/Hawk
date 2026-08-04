import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { resolveCommand, getModules } from '../../core/commands/CommandRegistry.js';
import {
  addPermit,
  removePermit,
  getPermitsForGuild,
} from '../../core/database/repositories/permissionRepo.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import { mentionUser, mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'access',
  aliases: ['permit'],
  module: 'owner',
  description: 'Manage custom command & module permits (list, add, remove) for users or roles.',
  usage: 'access list | access add <target> <command|module|all> | access remove <target> <command|module|all>',
  examples: [
    'access list',
    'access add @User wv',
    'access add @Role voice',
    'access add @User all',
    'access remove @User wv',
  ],
  permissions: [PermissionsBitField.Flags.ManageGuild],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, channel, respond } = ctx;

    if (parsed.args.length === 0) {
      await respond.error('Usage: `access list` | `access add <@user|@role> <scope>` | `access remove <@user|@role> <scope>`');
      return;
    }

    const firstArg = parsed.args[0].toLowerCase();

    // ── Subcommand: list ──────────────────────────────────────
    if (firstArg === 'list' || firstArg === 'show') {
      const permits = await getPermitsForGuild(guild.id);
      if (permits.length === 0) {
        await respond.info('No custom permits have been granted in this server.');
        return;
      }

      const lines = permits.map((p) => {
        const targetStr = p.targetType === 'user' ? mentionUser(p.targetId) : mentionRole(p.targetId);
        const scopeStr = p.commandName
          ? `Command: **\`${p.commandName}\`**`
          : p.moduleName
          ? `Module: **\`${p.moduleName}\`**`
          : '**ALL Commands & Modules**';
        return `• ${targetStr} (${p.targetType}) ➜ ${scopeStr}`;
      });

      const payload = buildV2Container({
        text: `**🔐 Active Custom Permits (${permits.length})**\n\n` + lines.join('\n'),
      });
      await (channel as GuildTextBasedChannel).send(payload);
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
      targetDisplay = mentionUser(targetId);
    } else {
      const roleResult = resolveRole(targetArg, guild);
      if (roleResult.success) {
        targetType = 'role';
        targetId = roleResult.value.id;
        targetDisplay = mentionRole(targetId);
      } else {
        await respond.error(`Could not resolve user or role \`${targetArg}\`.`);
        return;
      }
    }

    // 2. Parse scope (all, module:name, or command/module name)
    let commandName: string | null = null;
    let moduleName: string | null = null;

    if (scopeArg === 'all' || scopeArg === '*') {
      commandName = null;
      moduleName = null;
    } else if (scopeArg.startsWith('module:')) {
      const modName = scopeArg.slice(7).trim();
      const allModules = getModules();
      if (!allModules.includes(modName)) {
        await respond.error(`Unknown module \`${modName}\`. Available modules: ${allModules.join(', ')}`);
        return;
      }
      moduleName = modName;
    } else {
      const cmd = resolveCommand(scopeArg);
      if (cmd) {
        commandName = cmd.name;
        moduleName = cmd.module;
      } else {
        const allModules = getModules();
        if (allModules.includes(scopeArg)) {
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
      const removed = await removePermit(guild.id, targetType, targetId, commandName, moduleName);
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

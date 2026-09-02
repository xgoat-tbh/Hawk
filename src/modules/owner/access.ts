import {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
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
  removeAllPermitsForTarget,
} from '../../core/database/repositories/permissionRepo.js';
import {
  grantDashboardAccess,
  revokeDashboardAccess,
} from '../../core/database/repositories/dashboardAccessRepo.js';
import { ui, type ComponentV2Payload } from '../../core/ui/index.js';
import { mentionUser, mentionRole } from '../../core/utils/formatters.js';
import { sanitize } from '../../core/utils/validators.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';

interface GroupedPermit {
  targetType: 'user' | 'role';
  targetId: string;
  hasAll: boolean;
  commands: Set<string>;
  modules: Set<string>;
  earliestCreatedAt: Date;
}

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
      let permits = await getPermitsForGuild(guild.id);
      if (permits.length === 0) {
        await respond.info('No custom permits have been granted in this server.');
        return;
      }

      // Group permits by target (Role or User)
      const buildGrouped = () => {
        const map = new Map<string, GroupedPermit>();
        for (const p of permits) {
          const key = `${p.targetType}:${p.targetId}`;
          let entry = map.get(key);
          if (!entry) {
            entry = {
              targetType: p.targetType,
              targetId: p.targetId,
              hasAll: false,
              commands: new Set<string>(),
              modules: new Set<string>(),
              earliestCreatedAt: p.createdAt ?? new Date(),
            };
            map.set(key, entry);
          }

          if (p.createdAt && p.createdAt < entry.earliestCreatedAt) {
            entry.earliestCreatedAt = p.createdAt;
          }

          if (!p.commandName && !p.moduleName) {
            entry.hasAll = true;
          } else if (p.commandName) {
            entry.commands.add(p.commandName);
          } else if (p.moduleName) {
            entry.modules.add(p.moduleName);
          }
        }

        return Array.from(map.values()).sort((a, b) => {
          if (a.targetType !== b.targetType) {
            return a.targetType === 'role' ? -1 : 1;
          }
          return 0;
        });
      };

      let sortedEntries = buildGrouped();

      // Pre-fetch uncached user IDs to display actual usernames
      const userNameMap = new Map<string, string>();
      const fetchUserNames = async () => {
        const uncachedUserIds = sortedEntries
          .filter(g => g.targetType === 'user' && !guild.members.cache.has(g.targetId))
          .map(g => g.targetId);

        if (uncachedUserIds.length > 0) {
          await Promise.all(
            Array.from(new Set(uncachedUserIds)).map(async (uid) => {
              const user = guild.client.users.cache.get(uid) ?? (await guild.client.users.fetch(uid).catch(() => null));
              if (user) {
                userNameMap.set(uid, user.displayName || user.globalName || user.username);
              }
            })
          );
        }
      };

      await fetchUserNames();

      const PAGE_SIZE = 6;
      let currentPage = 0;

      const buildListPagePayload = (page: number): { payload: ComponentV2Payload; components: any[] } => {
        const totalPages = Math.max(1, Math.ceil(sortedEntries.length / PAGE_SIZE));
        const start = page * PAGE_SIZE;
        const pageItems = sortedEntries.slice(start, start + PAGE_SIZE);

        const lines = pageItems.map((g) => {
          let targetStr: string;
          if (g.targetType === 'user') {
            const resolvedName = userNameMap.get(g.targetId);
            targetStr = resolvedName ? `**${resolvedName}**` : mentionUser(g.targetId, guild);
          } else {
            targetStr = mentionRole(g.targetId, guild);
          }

          let scopesText: string;
          if (g.hasAll) {
            scopesText = '**ALL Commands & Modules**';
          } else {
            const parts: string[] = [];
            if (g.modules.size > 0) {
              const modList = Array.from(g.modules).map(m => `\`${m}\``).join(', ');
              parts.push(`Modules: ${modList}`);
            }
            if (g.commands.size > 0) {
              const cmdList = Array.from(g.commands).map(c => `\`${c}\``).join(', ');
              parts.push(`Commands: ${cmdList}`);
            }
            scopesText = parts.join(' • ');
          }

          return `• ${targetStr} (${g.targetType}) ➜ ${scopesText}`;
        });

        const listContent = lines.length > 0 ? lines.join('\n') : 'No active permits.';
        const footerText = `Page ${page + 1}/${totalPages} (Total Targets: ${sortedEntries.length} | Scopes: ${permits.length})`;

        // 1. Pagination buttons (placed INSIDE the container)
        let buttonRow: ActionRowBuilder<ButtonBuilder> | undefined;
        if (totalPages > 1) {
          const prevBtn = new ButtonBuilder()
            .setCustomId('access_page_prev')
            .setLabel('Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0);

          const countBtn = new ButtonBuilder()
            .setCustomId('access_page_count')
            .setLabel(`${page + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

          const nextBtn = new ButtonBuilder()
            .setCustomId('access_page_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1);

          buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, countBtn, nextBtn);
        }

        const basePayload = ui.standard({
          title: `Active Custom Permits (${sortedEntries.length} Targets)`,
          text: `${listContent}\n\n*${footerText}*`,
          components: buttonRow ? [buttonRow] : undefined,
        });

        // 2. Selector menu for detailed inspection (placed OUTSIDE the container)
        const selectOptions: StringSelectMenuOptionBuilder[] = sortedEntries.slice(0, 25).map((g) => {
          let nameLabel = g.targetId;
          if (g.targetType === 'user') {
            const memberObj = guild.members.cache.get(g.targetId);
            nameLabel = memberObj ? memberObj.displayName : (userNameMap.get(g.targetId) || `User ${g.targetId}`);
          } else {
            const roleObj = guild.roles.cache.get(g.targetId);
            nameLabel = roleObj ? roleObj.name : `Role ${g.targetId}`;
          }

          let desc = '';
          if (g.hasAll) {
            desc = 'ALL Commands & Modules';
          } else {
            const modStr = g.modules.size > 0 ? `Modules: ${Array.from(g.modules).join(', ')}` : '';
            const cmdStr = g.commands.size > 0 ? `Commands: ${Array.from(g.commands).join(', ')}` : '';
            desc = [modStr, cmdStr].filter(Boolean).join(' | ');
          }

          return new StringSelectMenuOptionBuilder()
            .setLabel(`${nameLabel.slice(0, 50)} (${g.targetType})`)
            .setValue(`inspect:${g.targetType}:${g.targetId}`)
            .setDescription(desc.slice(0, 100) || 'Active Permits');
        });

        const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('access_select_inspect')
            .setPlaceholder('Select a role or user to inspect details...')
            .addOptions(selectOptions)
        );

        return {
          payload: basePayload,
          components: [...basePayload.components, selectRow],
        };
      };

      const initial = buildListPagePayload(currentPage);
      const sentMsg = await respond.raw({
        components: initial.components,
        flags: initial.payload.flags as any,
      });

      const collector = sentMsg.createMessageComponentCollector({
        filter: (i) => i.user.id === member.id,
        time: 120_000,
      });

      collector.on('collect', async (interaction) => {
        // Helper to render target inspection payload
        const renderTargetInspection = async (targetType: 'user' | 'role', targetId: string): Promise<ComponentV2Payload | null> => {
          const targetEntry = sortedEntries.find(g => g.targetType === targetType && g.targetId === targetId);
          if (!targetEntry) return null;

          const details: string[] = [];
          let targetTitleName = targetId;

          let targetAvatarUrl: string | undefined;

          if (targetType === 'user') {
            const cachedMember = guild.members.cache.get(targetId);
            const fetchedUser = cachedMember?.user ?? guild.client.users.cache.get(targetId) ?? (await guild.client.users.fetch(targetId).catch(() => null));

            const displayName = cachedMember?.displayName || fetchedUser?.displayName || fetchedUser?.username || 'Unknown User';
            const username = fetchedUser ? `${fetchedUser.username}${fetchedUser.discriminator !== '0' ? `#${fetchedUser.discriminator}` : ''}` : 'Unknown';
            targetTitleName = displayName;
            targetAvatarUrl = fetchedUser?.displayAvatarURL({ size: 128 }) || cachedMember?.displayAvatarURL({ size: 128 }) || undefined;

            details.push(`• **Target User:** <@${targetId}> (\`${targetId}\`)`);
            details.push(`• **Username / Tag:** \`${username}\``);
            if (fetchedUser) {
              const createdTs = Math.floor(fetchedUser.createdTimestamp / 1000);
              details.push(`• **Account Created:** <t:${createdTs}:R> (<t:${createdTs}:d>)`);
            }
            if (cachedMember?.joinedTimestamp) {
              const joinedTs = Math.floor(cachedMember.joinedTimestamp / 1000);
              details.push(`• **Joined Server:** <t:${joinedTs}:R> (<t:${joinedTs}:d>)`);
            } else {
              details.push(`• **Server Status:** *Not currently in server (or uncached)*`);
            }
          } else {
            const roleObj = guild.roles.cache.get(targetId);
            targetTitleName = roleObj?.name || `Role ${targetId}`;
            targetAvatarUrl = roleObj?.iconURL({ size: 128 }) || undefined;

            details.push(`• **Target Role:** ${mentionRole(targetId, guild)} (\`${targetId}\`)`);
            if (roleObj) {
              details.push(`• **Role Members:** **${roleObj.members.size}** members`);
              details.push(`• **Role Color:** \`${roleObj.hexColor}\``);
              details.push(`• **Hierarchy Position:** #${roleObj.position}`);
            } else {
              details.push(`• **Role Status:** *Role was deleted from server*`);
            }
          }

          // Format permissions
          details.push('');
          details.push('**Granted Scopes:**');
          if (targetEntry.hasAll) {
            details.push('• **ALL Commands & Modules** (Global Access)');
          } else {
            if (targetEntry.modules.size > 0) {
              details.push(`• **Modules:** ${Array.from(targetEntry.modules).map(m => `\`${m}\``).join(', ')}`);
            }
            if (targetEntry.commands.size > 0) {
              details.push(`• **Commands:** ${Array.from(targetEntry.commands).map(c => `\`${c}\``).join(', ')}`);
            }
          }

          const unixGranted = Math.floor(targetEntry.earliestCreatedAt.getTime() / 1000);
          details.push(`• **Earliest Granted:** <t:${unixGranted}:f> (<t:${unixGranted}:R>)`);

          const backBtn = new ButtonBuilder()
            .setCustomId('access_back_list')
            .setLabel('Back to List')
            .setStyle(ButtonStyle.Secondary);

          const revokeBtn = new ButtonBuilder()
            .setCustomId(`access_ask_revoke:${targetType}:${targetId}`)
            .setLabel('Revoke All Access')
            .setStyle(ButtonStyle.Danger);

          const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn, revokeBtn);

          return ui.standard({
            title: `Access Profile: ${targetTitleName}`,
            text: details.join('\n'),
            thumbnailUrl: targetAvatarUrl,
            components: [actionRow],
          });
        };

        // Pagination & Action buttons
        if (interaction.isButton()) {
          if (interaction.customId === 'access_page_prev') {
            if (currentPage > 0) currentPage--;
            const updated = buildListPagePayload(currentPage);
            await interaction.update({
              components: updated.components,
              flags: updated.payload.flags as any,
            });
            return;
          }

          if (interaction.customId === 'access_page_next') {
            const totalPages = Math.ceil(sortedEntries.length / PAGE_SIZE);
            if (currentPage < totalPages - 1) currentPage++;
            const updated = buildListPagePayload(currentPage);
            await interaction.update({
              components: updated.components,
              flags: updated.payload.flags as any,
            });
            return;
          }

          if (interaction.customId === 'access_back_list') {
            const updated = buildListPagePayload(currentPage);
            await interaction.update({
              components: updated.components,
              flags: updated.payload.flags as any,
            });
            return;
          }

          // Revoke button clicked -> Show confirmation dialog
          if (interaction.customId.startsWith('access_ask_revoke:')) {
            const parts = interaction.customId.split(':');
            const targetType = parts[1] as 'user' | 'role';
            const targetId = parts[2];

            let targetName = targetId;
            if (targetType === 'user') {
              const mem = guild.members.cache.get(targetId);
              targetName = mem?.displayName || userNameMap.get(targetId) || `User ${targetId}`;
            } else {
              const roleObj = guild.roles.cache.get(targetId);
              targetName = roleObj?.name || `Role ${targetId}`;
            }

            const targetDisplay = targetType === 'role' ? mentionRole(targetId, guild) : `<@${targetId}>`;

            const confirmBtn = new ButtonBuilder()
              .setCustomId(`access_confirm_revoke:${targetType}:${targetId}`)
              .setLabel('Yes, Revoke All Access')
              .setStyle(ButtonStyle.Danger);

            const cancelBtn = new ButtonBuilder()
              .setCustomId(`access_cancel_revoke:${targetType}:${targetId}`)
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

            const confirmPayload = ui.standard({
              title: 'Confirm Access Revocation',
              text:
                `Are you sure you want to revoke **ALL** custom permits for **${targetName}** (${targetDisplay})?\n\n` +
                `This will immediately remove all permitted commands and modules for this ${targetType}.`,
              components: [row],
            });

            await interaction.update({
              components: confirmPayload.components,
              flags: confirmPayload.flags as any,
            });
            return;
          }

          // Cancel revocation -> Return to target inspection card
          if (interaction.customId.startsWith('access_cancel_revoke:')) {
            const parts = interaction.customId.split(':');
            const targetType = parts[1] as 'user' | 'role';
            const targetId = parts[2];

            const inspectPayload = await renderTargetInspection(targetType, targetId);
            if (inspectPayload) {
              await interaction.update({
                components: inspectPayload.components,
                flags: inspectPayload.flags as any,
              });
            } else {
              const updated = buildListPagePayload(currentPage);
              await interaction.update({
                components: updated.components,
                flags: updated.payload.flags as any,
              });
            }
            return;
          }

          // Confirmed revocation -> Execute revocation and show success
          if (interaction.customId.startsWith('access_confirm_revoke:')) {
            const parts = interaction.customId.split(':');
            const targetType = parts[1] as 'user' | 'role';
            const targetId = parts[2];

            const removedCount = await removeAllPermitsForTarget(
              guild.id,
              targetType,
              targetId,
              member.id,
              sanitize(member.displayName || member.user.tag)
            );

            logAuditAction({
              guild,
              action: 'Access Target Revoked',
              executor: member,
              details: [
                `• **Target Type:** ${targetType.toUpperCase()}`,
                `• **Target ID:** \`${targetId}\``,
                `• **Permits Revoked:** ${removedCount}`,
              ],
            });

            // Re-fetch permits
            permits = await getPermitsForGuild(guild.id);
            sortedEntries = buildGrouped();
            if (currentPage >= Math.ceil(sortedEntries.length / PAGE_SIZE)) {
              currentPage = Math.max(0, Math.ceil(sortedEntries.length / PAGE_SIZE) - 1);
            }

            const backBtn = new ButtonBuilder()
              .setCustomId('access_back_list')
              .setLabel('Back to Access List')
              .setStyle(ButtonStyle.Secondary);
            const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(backBtn);

            const revokeConfirmPayload = ui.standard({
              title: 'Access Revocation Successful',
              text: `Successfully revoked all **${removedCount}** permit(s) for <@${targetType === 'role' ? '&' : ''}${targetId}> (\`${targetId}\`).`,
              components: [buttonRow],
            });

            await interaction.update({
              components: revokeConfirmPayload.components,
              flags: revokeConfirmPayload.flags as any,
            });
            return;
          }
        }

        // Select menu for inspection
        if (interaction.isStringSelectMenu() && interaction.customId === 'access_select_inspect') {
          const selectedVal = interaction.values[0];
          const [, targetType, targetId] = selectedVal.split(':') as ['inspect', 'user' | 'role', string];

          const inspectPayload = await renderTargetInspection(targetType, targetId);
          if (!inspectPayload) {
            await interaction.reply({ content: 'Selected target is no longer active in permits.', flags: 64 });
            return;
          }

          await interaction.update({
            components: inspectPayload.components,
            flags: inspectPayload.flags as any,
          });
        }
      });

      collector.on('end', () => {
        sentMsg.edit({ components: [] }).catch(() => {});
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

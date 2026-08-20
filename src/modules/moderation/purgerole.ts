import {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type GuildTextBasedChannel,
} from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { removeRoleFromMember } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
import { ui } from '../../core/ui/index.js';
import { LiveProgressTracker, renderProgressBar } from '../../core/utils/ProgressBar.js';

export default defineCommand({
  name: 'purgerole',
  aliases: ['rr'],
  module: 'moderation',
  description: 'Purge (remove) a target role from all members who currently possess it in the server.',
  usage: 'purgerole <@role>',
  examples: ['purgerole @Muted', 'rr @level5'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member, channel, message } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}purgerole <@role>\``);
      return;
    }

    const roleRes = resolveRole(parsed.args.join(' '), guild);
    if (!roleRes.success) {
      await respond.error(`Role: ${roleRes.error}`);
      return;
    }

    const targetRole = roleRes.value.role;

    // Fetch all guild members to ensure uncached members possessing targetRole are loaded
    const allMembers = await guild.members.fetch().catch(() => guild.members.cache);
    const membersWithRole = Array.from(allMembers.filter(m => m.roles.cache.has(targetRole.id)).values());
    const totalMembers = membersWithRole.length;

    if (totalMembers === 0) {
      await respond.info(`No members currently possess the role ${mentionRole(targetRole, guild)}.`);
      return;
    }

    // Safety Confirmation Guard for high-impact purges (>10 members)
    if (totalMembers > 10) {
      const confirmId = `purgerole_confirm_${message.id}`;
      const cancelId = `purgerole_cancel_${message.id}`;

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(confirmId)
          .setLabel(`Confirm Purge (${totalMembers} members)`)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(cancelId)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary),
      );

      const promptPayload = ui.standard({
        title: 'High-Impact Role Purge Confirmation',
        text:
          `Are you sure you want to remove ${mentionRole(targetRole, guild)} from **${totalMembers}** members?\n\n` +
          'This action cannot be undone automatically. You have **30 seconds** to confirm.',
        components: [row],
      });

      const promptMsg = await (channel as GuildTextBasedChannel).send({
        components: promptPayload.components,
        flags: promptPayload.flags as any,
      });

      let confirmed = false;
      try {
        const interaction = await promptMsg.awaitMessageComponent({
          filter: (i) => i.user.id === member.id && (i.customId === confirmId || i.customId === cancelId),
          time: 30_000,
          componentType: ComponentType.Button,
        });

        if (interaction.customId === confirmId) {
          confirmed = true;
          await interaction.deferUpdate().catch(() => {});
        } else {
          await interaction.update({
            content: '> Role purge cancelled.',
            components: [],
          }).catch(() => {});
          setTimeout(() => promptMsg.delete().catch(() => {}), 5000);
          return;
        }
      } catch {
        // Timeout
        await promptMsg.edit({
          content: '> Role purge confirmation timed out.',
          components: [],
        }).catch(() => {});
        setTimeout(() => promptMsg.delete().catch(() => {}), 5000);
        return;
      }

      if (!confirmed) return;
      await promptMsg.delete().catch(() => {});
    }

    // Send initial live progress message
    const initialPayload = ui.standard({
      title: `Purging Role: ${targetRole.name}`,
      text: `Target: ${mentionRole(targetRole, guild)} (${totalMembers} members)\n**Progress:** ${renderProgressBar(0, totalMembers)} (0/${totalMembers})\nRemoved: **0** | Skipped: **0**`,
    });
    const statusMsg = await (channel as GuildTextBasedChannel).send({
      components: initialPayload.components,
      flags: initialPayload.flags as any,
    }).catch(() => null);
    const tracker = statusMsg ? new LiveProgressTracker(statusMsg, `Purging Role (${targetRole.name})`, totalMembers) : null;

    let removedCount = 0;
    let skippedCount = 0;
    let processed = 0;

    const CHUNK_SIZE = 5;
    for (let i = 0; i < membersWithRole.length; i += CHUNK_SIZE) {
      const chunk = membersWithRole.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(targetMember =>
          removeRoleFromMember(guild, targetMember, targetRole, member).then(res => ({ targetMember, res }))
        )
      );

      for (const { res } of results) {
        if (res === 'removed') {
          removedCount++;
        } else {
          skippedCount++;
        }
      }
      processed += chunk.length;
      if (tracker) {
        await tracker.update(processed, `Removed: **${removedCount}** | Skipped: **${skippedCount}**`);
      }
      if (i + CHUNK_SIZE < membersWithRole.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (tracker) {
      await tracker.update(totalMembers, `Removed: **${removedCount}** | Skipped: **${skippedCount}**`, true);
    }

    const finalPayload = ui.standard({
      title: 'Role Purge Completed',
      text:
        `• **Target Role:** \`${targetRole.name}\` (${mentionRole(targetRole, guild)})\n` +
        `• **Removed From:** **${removedCount}** member(s)` +
        (skippedCount > 0 ? `\n• **Skipped:** **${skippedCount}** member(s)` : '') +
        '\n• *(Auto-deleting in 5s)*',
    });

    if (statusMsg) {
      await statusMsg.edit({ components: finalPayload.components, flags: finalPayload.flags as any }).catch(() => {});
      setTimeout(() => {
        statusMsg?.delete().catch(() => {});
      }, 5000);
    } else {
      const replyMsg = await respond.success(
        `Purged role \`${targetRole.name}\` (${mentionRole(targetRole, guild)}) from **${removedCount}** member(s).` +
        (skippedCount > 0 ? ` Skipped: **${skippedCount}**` : ''),
      );
      setTimeout(() => {
        replyMsg.delete().catch(() => {});
      }, 5000);
    }

    logAuditAction({
      guild,
      action: 'Role Purged from Members',
      executor: member,
      target: mentionRole(targetRole, guild),
      details: [
        `• **Role:** \`${targetRole.name}\` (${targetRole.id})`,
        `• **Members Affected:** ${removedCount} removed (Skipped: ${skippedCount})`,
      ],
    });

    logEvent('info', 'command_execution', `Role purge (${targetRole.name}) by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetRole: targetRole.name,
      targetRoleId: targetRole.id,
      removedCount,
      skippedCount,
    });
  },
});

import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { removeRoleFromMember } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
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
  cooldown: 10,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

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

    // Send initial live progress message
    const initialPayload = ui.standard({
      title: `Purging Role: ${targetRole.name}`,
      text: `Target: ${mentionRole(targetRole, guild)} (${totalMembers} members)\n**Progress:** ${renderProgressBar(0, totalMembers)} (0/${totalMembers})\nRemoved: **0** | Skipped: **0**`,
    });
    const statusMsg = await (ctx.channel as GuildTextBasedChannel).send({
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
        (skippedCount > 0 ? `\n• **Skipped:** **${skippedCount}** member(s)` : ''),
    });

    if (statusMsg) {
      await statusMsg.edit({ components: finalPayload.components, flags: finalPayload.flags as any }).catch(() => {});
    } else {
      await respond.success(
        `Purged role \`${targetRole.name}\` (${mentionRole(targetRole, guild)}) from **${removedCount}** member(s).` +
        (skippedCount > 0 ? ` Skipped: **${skippedCount}**` : ''),
      );
    }

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

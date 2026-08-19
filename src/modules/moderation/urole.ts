import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { toggleRoleForMember } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { ui } from '../../core/ui/index.js';
import { LiveProgressTracker, renderProgressBar } from '../../core/utils/ProgressBar.js';

export default defineCommand({
  name: 'urole',
  aliases: ['ur', 'removerole', 'unrole', 'takerole'],
  module: 'moderation',
  description: 'Toggle ONE role across MULTIPLE users.',
  usage: 'urole <role> <users...>',
  examples: ['urole @Role @User1 @User2 @User3'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    if (parsed.args.length < 2) {
      await respond.error(`Usage: \`${parsed.prefix}urole <role> <users...>\``);
      return;
    }

    const roleRes = resolveRole(parsed.args[0], guild);
    if (!roleRes.success) {
      await respond.error(`Role: ${roleRes.error}`);
      return;
    }

    const targetRole = roleRes.value.role;
    const userArgs = parsed.args.slice(1);
    const totalUsers = userArgs.length;

    let statusMsg = null;
    let tracker: LiveProgressTracker | null = null;
    if (totalUsers > 3) {
      const initialPayload = ui.standard({
        title: `URole: ${targetRole.name}`,
        text: `Target: ${mentionRole(targetRole, guild)} (${totalUsers} users)\n**Progress:** ${renderProgressBar(0, totalUsers)} (0/${totalUsers})\nAdded: **0** | Removed: **0** | Skipped: **0**`,
      });
      statusMsg = await (ctx.channel as GuildTextBasedChannel).send({
        components: initialPayload.components,
        flags: initialPayload.flags as any,
      }).catch(() => null);
      if (statusMsg) {
        tracker = new LiveProgressTracker(statusMsg, `URole (${targetRole.name})`, totalUsers);
      }
    }

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;
    const affectedMembersList: import('discord.js').GuildMember[] = [];

    let processed = 0;
    const CHUNK_SIZE = 5;
    for (let i = 0; i < userArgs.length; i += CHUNK_SIZE) {
      const chunk = userArgs.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(async (userArg) => {
          const userRes = await resolveUser(userArg, guild);
          if (!userRes.success || !userRes.value.member) {
            return { member: null, res: 'skipped' as const };
          }
          const targetMem = userRes.value.member;
          const res = await toggleRoleForMember(guild, targetMem, targetRole, member);
          return { member: targetMem, res };
        })
      );

      for (const { member: targetMem, res } of results) {
        if (res === 'added' && targetMem) {
          addedCount++;
          affectedMembersList.push(targetMem);
        } else if (res === 'removed' && targetMem) {
          removedCount++;
          affectedMembersList.push(targetMem);
        } else {
          skippedCount++;
        }
      }
      processed += chunk.length;
      if (tracker) {
        await tracker.update(processed, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`);
      }
      if (i + CHUNK_SIZE < userArgs.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (tracker) {
      await tracker.update(totalUsers, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`, true);
    }

    const finalPayload = ui.standard({
      title: 'URole Completed',
      text:
        `• **Target Role:** \`${targetRole.name}\` (${mentionRole(targetRole, guild)})\n` +
        `• **Added:** **${addedCount}** | **Removed:** **${removedCount}**` +
        (skippedCount > 0 ? ` | **Skipped:** **${skippedCount}**` : ''),
    });

    if (statusMsg) {
      await statusMsg.edit({ components: finalPayload.components, flags: finalPayload.flags as any }).catch(() => {});
    } else {
      await respond.success(
        `Role update for ${mentionRole(targetRole, guild)}:\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}`,
      );
    }

    logEvent('info', 'command_execution', `URole toggle by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetRole: targetRole.name,
      addedCount,
      removedCount,
      skippedCount,
    });
  },
});

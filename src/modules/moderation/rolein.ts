import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { addRoleToMember, removeRoleFromMember } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import { LiveProgressTracker, renderProgressBar } from '../../core/utils/ProgressBar.js';

export default defineCommand({
  name: 'rolein',
  aliases: ['rin', 'rolemembers'],
  module: 'moderation',
  description: 'Add or remove (with ?rm) a role for all members who currently possess a target role.',
  usage: 'rolein <target_population_role> <role_to_assign> [?rm]',
  examples: ['rolein @Members @VIP', 'rolein @monopoly @amongus ?rm'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    const isRemoveMode = parsed.args.includes('?rm');
    const roleArgs = parsed.args.filter(a => a !== '?rm');

    if (roleArgs.length < 2) {
      await respond.error(`Usage: \`${parsed.prefix}rolein <target_population_role> <role_to_assign> [?rm]\``);
      return;
    }

    const popRoleRes = resolveRole(roleArgs[0], guild);
    if (!popRoleRes.success) {
      await respond.error(`Population Role: ${popRoleRes.error}`);
      return;
    }

    const toggleRoleRes = resolveRole(roleArgs[1], guild);
    if (!toggleRoleRes.success) {
      await respond.error(`Role: ${toggleRoleRes.error}`);
      return;
    }

    const popRole = popRoleRes.value.role;
    const toggleRole = toggleRoleRes.value.role;

    // Directly target members possessing popRole without a full guild member fetch
    const membersWithPopRole = Array.from(popRole.members.values());
    const totalMembers = membersWithPopRole.length;

    if (totalMembers === 0) {
      await respond.info(`No members currently possess the role ${mentionRole(popRole.id)}.`);
      return;
    }

    // Send initial live progress message
    const initialPayload = buildV2Container({
      text: `⏳ **Processing RoleIn** (${mentionRole(toggleRole.id)} for ${mentionRole(popRole.id)}) [Mode: ${isRemoveMode ? 'REMOVE' : 'ADD'}]`,
      sections: [`**Progress:** ${renderProgressBar(0, totalMembers)} (0/${totalMembers})\nAdded: **0** | Removed: **0** | Skipped: **0**`],
    });
    const statusMsg = await (ctx.channel as GuildTextBasedChannel).send(initialPayload).catch(() => null);
    const tracker = statusMsg ? new LiveProgressTracker(statusMsg, `RoleIn (${popRole.name})`, totalMembers) : null;

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;
    let processed = 0;
    const affectedMembersList: import('discord.js').GuildMember[] = [];
    const CHUNK_SIZE = 5;
    for (let i = 0; i < membersWithPopRole.length; i += CHUNK_SIZE) {
      const chunk = membersWithPopRole.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(targetMember =>
          isRemoveMode
            ? removeRoleFromMember(guild, targetMember, toggleRole, member).then(res => ({ targetMember, res }))
            : addRoleToMember(guild, targetMember, toggleRole, member).then(res => ({ targetMember, res }))
        )
      );

      for (const { targetMember, res } of results) {
        if (res === 'added') {
          addedCount++;
          affectedMembersList.push(targetMember);
        } else if (res === 'removed') {
          removedCount++;
          affectedMembersList.push(targetMember);
        } else {
          skippedCount++;
        }
      }
      processed += chunk.length;
      if (tracker) {
        await tracker.update(processed, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`);
      }
      if (i + CHUNK_SIZE < membersWithPopRole.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (tracker) {
      await tracker.update(totalMembers, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`, true);
    }

    const finalPayload = buildV2Container({
      text: `✅ **RoleIn Completed** (${mentionRole(toggleRole.id)} for ${mentionRole(popRole.id)})`,
      sections: [`Added: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}`],
    });

    if (statusMsg) {
      await statusMsg.edit({ content: undefined, components: finalPayload.components }).catch(() => {});
    } else {
      await respond.success(
        `RoleIn update (${mentionRole(toggleRole.id)} for members in ${mentionRole(popRole.id)}):\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}`,
      );
    }

    logEvent('info', 'command_execution', `RoleIn (${isRemoveMode ? 'remove' : 'add'}) by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      popRole: popRole.name,
      toggleRole: toggleRole.name,
      mode: isRemoveMode ? 'remove' : 'add',
      addedCount,
      removedCount,
      skippedCount,
    });
  },
});

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
  name: 'roleall',
  aliases: ['rall', 'massrole'],
  module: 'moderation',
  description: 'Add or remove (with ?rm) a role across all human or all bot accounts in the server.',
  usage: 'roleall <human|bot> <role_to_assign> [?rm]',
  examples: ['roleall human @Members', 'roleall humans @level5 ?rm', 'roleall bot @BotRole'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 10,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    const isRemoveMode = parsed.args.includes('?rm');
    const roleArgs = parsed.args.filter(a => a !== '?rm');

    if (roleArgs.length < 2) {
      await respond.error(`Usage: \`${parsed.prefix}roleall <human|bot> <role_to_assign> [?rm]\``);
      return;
    }

    const targetType = roleArgs[0].toLowerCase();
    if (targetType !== 'human' && targetType !== 'bot' && targetType !== 'bots' && targetType !== 'humans') {
      await respond.error('Target population must be `human` or `bot`.');
      return;
    }

    const isBotTarget = targetType === 'bot' || targetType === 'bots';
    const roleRes = resolveRole(roleArgs[1], guild);
    if (!roleRes.success) {
      await respond.error(`Role: ${roleRes.error}`);
      return;
    }

    const toggleRole = roleRes.value.role;

    // Fetch all guild members to ensure uncached members are loaded
    const allMembers = await guild.members.fetch().catch(() => guild.members.cache);
    const targetMembers = Array.from(allMembers.filter(m => isBotTarget ? m.user.bot : !m.user.bot).values());
    const totalMembers = targetMembers.length;

    if (totalMembers === 0) {
      await respond.info(`No ${isBotTarget ? 'bot' : 'human'} members found in this server.`);
      return;
    }

    // Send initial live progress message
    const initialPayload = buildV2Container({
      text: `⏳ **Processing RoleAll** (${mentionRole(toggleRole.id)} for ${isBotTarget ? 'bots' : 'humans'}) [Mode: ${isRemoveMode ? 'REMOVE' : 'ADD'}]`,
      sections: [`**Progress:** ${renderProgressBar(0, totalMembers)} (0/${totalMembers})\nAdded: **0** | Removed: **0** | Skipped: **0**`],
    });
    const statusMsg = await (ctx.channel as GuildTextBasedChannel).send(initialPayload).catch(() => null);
    const tracker = statusMsg ? new LiveProgressTracker(statusMsg, `RoleAll (${isBotTarget ? 'bots' : 'humans'})`, totalMembers) : null;

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;
    const affectedMembersList: import('discord.js').GuildMember[] = [];

    let processed = 0;
    const CHUNK_SIZE = 5;
    for (let i = 0; i < targetMembers.length; i += CHUNK_SIZE) {
      const chunk = targetMembers.slice(i, i + CHUNK_SIZE);
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
      if (i + CHUNK_SIZE < targetMembers.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    if (tracker) {
      await tracker.update(totalMembers, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`, true);
    }

    const finalPayload = buildV2Container({
      text: `✅ **RoleAll Completed** (${mentionRole(toggleRole.id)} for ${isBotTarget ? 'bots' : 'humans'})`,
      sections: [`Added: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}`],
    });

    if (statusMsg) {
      await statusMsg.edit({ content: undefined, components: finalPayload.components }).catch(() => {});
    } else {
      await respond.success(
        `RoleAll update (${mentionRole(toggleRole.id)} for ${isBotTarget ? 'bots' : 'humans'}):\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}`,
      );
    }

    logEvent('info', 'command_execution', `RoleAll (${isRemoveMode ? 'remove' : 'add'}) by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetPopulation: isBotTarget ? 'bot' : 'human',
      toggleRole: toggleRole.name,
      mode: isRemoveMode ? 'remove' : 'add',
      addedCount,
      removedCount,
      skippedCount,
    });
  },
});

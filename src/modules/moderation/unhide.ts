import { PermissionsBitField, OverwriteType, TextChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { mentionRole, mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';

export default defineCommand({
  name: 'unhide',
  aliases: ['uh', 'unhidechannel'],
  module: 'moderation',
  description: 'Unhide a channel by restoring ViewChannel permission according to target mode.',
  usage: 'unhide [@Role|all]',
  examples: ['unhide', 'unhide @GameHost', 'unhide all'],
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, respond, member } = ctx;

    const targetChannel = channel as TextChannel;
    if (!('permissionOverwrites' in targetChannel)) {
      await respond.error('Unhide can only be executed in text channels.');
      return;
    }

    if (parsed.args.length > 1) {
      await respond.error(`Usage: \`${parsed.prefix}unhide [@Role|all]\` (accepts at most one target argument).`);
      return;
    }

    let logTarget = 'everyone';

    // Mode 1: No argument -> @everyone: INHERIT (null)
    if (parsed.args.length === 0) {
      const everyoneRole = guild.roles.everyone;
      await targetChannel.permissionOverwrites.edit(everyoneRole.id, {
        ViewChannel: null,
      }).catch(() => {});
      logTarget = mentionRole(everyoneRole, guild);
      await respond.transientSuccess(`Unhidden ${mentionChannel(targetChannel.id)} for ${logTarget} (inherited). *(Auto-deleting in 5s)*`, 5000);
    }
    // Mode 3: "all" argument -> @everyone: INHERIT (null) + every existing role override: INHERIT (null)
    else if (parsed.args[0].toLowerCase() === 'all') {
      const everyoneRole = guild.roles.everyone;
      await targetChannel.permissionOverwrites.edit(everyoneRole.id, {
        ViewChannel: null,
      }).catch(() => {});

      let count = 1;
      for (const [, overwrite] of targetChannel.permissionOverwrites.cache) {
        if (overwrite.type === OverwriteType.Role && overwrite.id !== everyoneRole.id) {
          await targetChannel.permissionOverwrites.edit(overwrite.id, {
            ViewChannel: null,
          }).catch(() => {});
          count++;
          await new Promise(r => setTimeout(r, 50));
        }
      }
      logTarget = `All roles (${count} overrides)`;
      await respond.transientSuccess(`Unhidden ${mentionChannel(targetChannel.id)} for all **${count}** role overrides (inherited). *(Auto-deleting in 5s)*`, 5000);
    }
    // Mode 2: Role argument -> ONLY specified role: ALLOW (true)
    else {
      const roleRes = resolveRole(parsed.args[0], guild);
      if (!roleRes.success) {
        await respond.error(`Invalid target argument. Expected a role or 'all'. Error: ${roleRes.error}`);
        return;
      }
      const targetRole = roleRes.value.role;
      await targetChannel.permissionOverwrites.edit(targetRole.id, {
        ViewChannel: true,
      });
      logTarget = mentionRole(targetRole, guild);
      await respond.transientSuccess(`Unhidden ${mentionChannel(targetChannel.id)} for ${logTarget} (explicitly allowed). *(Auto-deleting in 5s)*`, 5000);
    }

    logAuditAction({
      guild,
      action: 'Channel Unhidden',
      executor: member,
      channelName: targetChannel.name,
      details: `• **Scope:** ${logTarget}`,
    });

    logEvent('info', 'command_execution', `Channel unhide by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetChannel: targetChannel.name,
      args: parsed.rawArgs,
    });
  },
});

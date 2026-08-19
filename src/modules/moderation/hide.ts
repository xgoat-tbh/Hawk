import { PermissionsBitField, OverwriteType, TextChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { mentionRole, mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'hide',
  aliases: ['h', 'hidechannel'],
  module: 'moderation',
  description: 'Hide a channel by denying ViewChannel permission according to target mode.',
  usage: 'hide [@Role|all]',
  examples: ['hide', 'hide @GameHost', 'hide all'],
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, respond, member } = ctx;

    const targetChannel = channel as TextChannel;
    if (!('permissionOverwrites' in targetChannel)) {
      await respond.error('Hide can only be executed in text channels.');
      return;
    }

    if (parsed.args.length > 1) {
      await respond.error(`Usage: \`${parsed.prefix}hide [@Role|all]\` (accepts at most one target argument).`);
      return;
    }

    // Mode 1: No argument -> @everyone: DENY
    if (parsed.args.length === 0) {
      const everyoneRole = guild.roles.everyone;
      await targetChannel.permissionOverwrites.edit(everyoneRole.id, {
        ViewChannel: false,
      }).catch(() => {});
      await respond.success(`Hidden ${mentionChannel(targetChannel.id)} from ${mentionRole(everyoneRole, guild)}.`);
    }
    // Mode 3: "all" argument -> @everyone: DENY + every existing role override: DENY
    else if (parsed.args[0].toLowerCase() === 'all') {
      const everyoneRole = guild.roles.everyone;
      await targetChannel.permissionOverwrites.edit(everyoneRole.id, {
        ViewChannel: false,
      }).catch(() => {});

      let count = 1;
      for (const [, overwrite] of targetChannel.permissionOverwrites.cache) {
        if (overwrite.type === OverwriteType.Role && overwrite.id !== everyoneRole.id) {
          await targetChannel.permissionOverwrites.edit(overwrite.id, {
            ViewChannel: false,
          }).catch(() => {});
          count++;
          await new Promise(r => setTimeout(r, 50));
        }
      }
      await respond.success(`Hidden ${mentionChannel(targetChannel.id)} from all **${count}** role overrides.`);
    }
    // Mode 2: Role argument -> ONLY specified role: DENY
    else {
      const roleRes = resolveRole(parsed.args[0], guild);
      if (!roleRes.success) {
        await respond.error(`Invalid target argument. Expected a role or 'all'. Error: ${roleRes.error}`);
        return;
      }
      const targetRole = roleRes.value.role;
      await targetChannel.permissionOverwrites.edit(targetRole.id, {
        ViewChannel: false,
      });
      await respond.success(`Hidden ${mentionChannel(targetChannel.id)} from ${mentionRole(targetRole, guild)}.`);
    }

    logEvent('info', 'command_execution', `Channel hide by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetChannel: targetChannel.name,
      args: parsed.rawArgs,
    });
  },
});

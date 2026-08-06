import { PermissionsBitField, TextChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { mentionRole, mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'unhide',
  aliases: ['unh', 'unhidechannel', 'show'],
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
      await respond.error('Usage: `?unhide [@Role|all]` (accepts at most one target argument).');
      return;
    }

    // Mode 1: No argument -> @everyone: INHERIT (null)
    if (parsed.args.length === 0) {
      const everyoneRole = guild.roles.everyone;
      await targetChannel.permissionOverwrites.edit(everyoneRole.id, {
        ViewChannel: null,
      });
      await respond.success(`Unhidden ${mentionChannel(targetChannel.id)} for ${mentionRole(everyoneRole.id)} (inherited).`);
    }
    // Mode 3: "all" argument -> @everyone: INHERIT (null) + every existing role override: INHERIT (null)
    else if (parsed.args[0].toLowerCase() === 'all') {
      const everyoneRole = guild.roles.everyone;
      await targetChannel.permissionOverwrites.edit(everyoneRole.id, {
        ViewChannel: null,
      });

      let count = 1;
      for (const [, overwrite] of targetChannel.permissionOverwrites.cache) {
        if (overwrite.type === 0 /* Role */ && overwrite.id !== everyoneRole.id) {
          await targetChannel.permissionOverwrites.edit(overwrite.id, {
            ViewChannel: null,
          }).catch(() => {});
          count++;
        }
      }
      await respond.success(`Unhidden ${mentionChannel(targetChannel.id)} for all **${count}** role overrides (inherited).`);
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
      await respond.success(`Unhidden ${mentionChannel(targetChannel.id)} for ${mentionRole(targetRole.id)} (explicitly allowed).`);
    }

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

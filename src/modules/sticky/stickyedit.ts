import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSticky, setSticky } from '../../core/database/repositories/stickyRepo.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

export default defineCommand({
  name: 'stickyedit',
  module: 'sticky',
  description: 'Edit the existing sticky message in the current channel.',
  usage: 'stickyedit <new_message...>',
  examples: ['stickyedit Updated channel information and rules.'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, message, respond, member } = ctx;

    const existingSticky = await getSticky(guild.id, channel.id);
    if (!existingSticky) {
      await respond.error(`No active sticky configuration found for this channel. Use \`${parsed.prefix}stick <message...>\` first.`);
      return;
    }

    const newContent = parsed.rawArgs.trim();
    if (!newContent) {
      await respond.error(`Usage: \`${parsed.prefix}stickyedit <new_message...>\``);
      return;
    }

    const textChannel = channel as GuildTextBasedChannel;
    const oldMsgId = existingSticky.messageId;

    // Auto-delete command invocation message
    await message.delete().catch((err) => {
      consoleLog('warning', 'command_execution', `stickyedit: failed to delete command message: ${err instanceof Error ? err.message : String(err)}`);
    });

    let newMsgId = oldMsgId;
    const targetMsg = await textChannel.messages.fetch(oldMsgId).catch(() => null);

    if (targetMsg) {
      // Edit existing Discord message in-place
      await targetMsg.edit({
        content: newContent,
        allowedMentions: {
          parse: [],
          roles: [],
          users: [],
        },
      });
    } else {
      // Recreate message if previous sticky message was deleted externally
      const recreatedMsg = await textChannel.send({
        content: newContent,
        allowedMentions: {
          parse: [],
          roles: [],
          users: [],
        },
      });
      newMsgId = recreatedMsg.id;
    }

    // Save updated content in database
    await setSticky({
      guildId: guild.id,
      channelId: channel.id,
      messageId: newMsgId,
      content: newContent,
    });

    logEvent('info', 'command_execution', `Sticky edited in #${channel.name} by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      channel: channel.name,
      channelId: channel.id,
      oldMessageId: oldMsgId,
      newMessageId: newMsgId,
      newContent,
    });
  },
});

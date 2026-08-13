import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSticky, updateStickyMessageId } from '../../core/database/repositories/stickyRepo.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

export default defineCommand({
  name: 'stickyrefresh',
  aliases: ['refreshsticky', 'stickrefresh', 'srefresh'],
  module: 'sticky',
  description: 'Force refresh and resurface the active sticky message at the bottom of the current channel.',
  usage: 'stickyrefresh',
  examples: ['stickyrefresh'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, channel, message, respond, member } = ctx;

    const existingSticky = await getSticky(guild.id, channel.id);
    if (!existingSticky) {
      await respond.error('No active sticky configuration found for this channel.');
      return;
    }

    const textChannel = channel as GuildTextBasedChannel;
    const oldMsgId = existingSticky.messageId;

    // 1. Delete command invocation message
    await message.delete().catch((err) => {
      consoleLog('warning', 'command_execution', `stickyrefresh: failed to delete command message: ${err instanceof Error ? err.message : String(err)}`);
    });

    // 2. Delete previous sticky message if still present
    const prevMsg = await textChannel.messages.fetch(oldMsgId).catch(() => null);
    if (prevMsg) {
      await prevMsg.delete().catch(() => {});
    }

    // 3. Post fresh sticky message at the very bottom of the channel
    const newStickyMsg = await textChannel.send({
      content: existingSticky.content,
      allowedMentions: {
        parse: [],
        roles: [],
        users: [],
      },
    });

    // 4. Update message ID in database
    await updateStickyMessageId(guild.id, channel.id, newStickyMsg.id);

    logEvent('info', 'command_execution', `Sticky refreshed in #${channel.name} by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      channel: channel.name,
      channelId: channel.id,
      oldMessageId: oldMsgId,
      newMessageId: newStickyMsg.id,
    });
  },
});

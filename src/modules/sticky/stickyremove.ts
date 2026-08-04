import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSticky, deleteSticky } from '../../core/database/repositories/stickyRepo.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

export default defineCommand({
  name: 'stickyremove',
  module: 'sticky',
  description: 'Remove the active sticky message configuration from the current channel.',
  usage: 'stickyremove',
  examples: ['stickyremove'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.ManageMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, channel, message, respond, member } = ctx;

    const existingSticky = await getSticky(guild.id, channel.id);
    if (!existingSticky) {
      await respond.error('No active sticky configuration found for this channel.');
      return;
    }

    const textChannel = channel as GuildTextBasedChannel;

    // 1. Delete Discord message (stale message handled safely)
    const targetMsg = await textChannel.messages.fetch(existingSticky.messageId).catch(() => null);
    if (targetMsg) {
      await targetMsg.delete().catch(() => {});
    }

    // 2. Delete database record for current channel
    await deleteSticky(guild.id, channel.id);

    // 3. Auto-delete command invocation message
    await message.delete().catch((err) => {
      consoleLog('warning', 'command_execution', `stickyremove: failed to delete command message: ${err instanceof Error ? err.message : String(err)}`);
    });

    logEvent('info', 'command_execution', `Sticky removed from #${channel.name} by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      channel: channel.name,
      channelId: channel.id,
      removedMessageId: existingSticky.messageId,
    });
  },
});

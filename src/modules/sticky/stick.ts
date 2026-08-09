import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSticky, setSticky } from '../../core/database/repositories/stickyRepo.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

export default defineCommand({
  name: 'stick',
  module: 'sticky',
  description: 'Create or update the sticky message for the current channel.',
  usage: 'stick <message...>',
  examples: ['stick Welcome to the server! Please read #rules.'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, message, respond, member } = ctx;

    const stickyContent = parsed.rawArgs.trim();
    if (!stickyContent) {
      await respond.error(`Usage: \`${parsed.prefix}stick <message...>\``);
      return;
    }

    const textChannel = channel as GuildTextBasedChannel;
    const existingSticky = await getSticky(guild.id, channel.id);

    // 1. Delete previous sticky message if present
    if (existingSticky) {
      const prevMsg = await textChannel.messages.fetch(existingSticky.messageId).catch(() => null);
      if (prevMsg) {
        await prevMsg.delete().catch(() => {});
      }
    }

    // 2. Auto-delete command invocation message
    await message.delete().catch((err) => {
      consoleLog('warning', 'command_execution', `stick: failed to delete command message: ${err instanceof Error ? err.message : String(err)}`);
    });

    // 3. Post new sticky message with strict allowedMentions (preserves exact text, emojis, links)
    const stickyMsg = await textChannel.send({
      content: stickyContent,
      allowedMentions: {
        parse: [],
        roles: [],
        users: [],
      },
    });

    // 4. Save/update sticky configuration in database for (guild_id, channel_id)
    const record = await setSticky({
      guildId: guild.id,
      channelId: channel.id,
      messageId: stickyMsg.id,
      content: stickyContent,
    });

    logEvent('info', 'command_execution', `Sticky created in #${channel.name} by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      channel: channel.name,
      channelId: channel.id,
      messageId: stickyMsg.id,
      content: stickyContent,
      stickyId: record.id,
    });
  },
});

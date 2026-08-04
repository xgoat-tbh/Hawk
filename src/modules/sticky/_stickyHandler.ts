import type { Message, GuildTextBasedChannel } from 'discord.js';
import { getSticky, updateStickyMessageId } from '../../core/database/repositories/stickyRepo.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

export async function handleStickyResurface(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;

  const guildId = message.guild.id;
  const channelId = message.channel.id;

  const sticky = await getSticky(guildId, channelId);
  if (!sticky) return;

  // Do not resurface if the message is the sticky itself
  if (message.id === sticky.messageId) return;

  const textChannel = message.channel as GuildTextBasedChannel;

  // 1. Delete previous sticky message (stale message handled safely)
  try {
    const prevMsg = await textChannel.messages.fetch(sticky.messageId).catch(() => null);
    if (prevMsg) {
      await prevMsg.delete().catch(() => {});
    }
  } catch {
    // Ignore stale message deletion errors
  }

  // 2. Repost sticky message at bottom of channel
  try {
    const newStickyMsg = await textChannel.send({
      content: sticky.content,
      allowedMentions: {
        parse: [],
        roles: [],
        users: [],
      },
    });

    // 3. Update active message ID in database
    await updateStickyMessageId(guildId, channelId, newStickyMsg.id);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    consoleLog('warning', 'command_execution', `Failed to resurface sticky in ${channelId}`, { error: msg });
  }
}

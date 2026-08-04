import { PermissionsBitField } from 'discord.js';
import type { Message, TextChannel, Collection } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'purge',
  module: 'moderation',
  description: 'Purge recent messages matching an optional filter.',
  usage: 'purge <amount> [bot|human|@user|embeds|links|images]',
  examples: ['purge 50 bot', 'purge 100 human', 'purge 50 @User', 'purge 100 embeds'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ReadMessageHistory],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, message, respond, member } = ctx;

    if (parsed.args.length === 0) {
      await respond.error('Usage: `?purge <amount> [bot|human|@user|embeds|links|images]`');
      return;
    }

    const amount = parseInt(parsed.args[0], 10);
    if (isNaN(amount) || amount <= 0 || amount > 500) {
      await respond.error('Please specify a valid purge amount between 1 and 500.');
      return;
    }

    const filterArg = parsed.args[1] ? parsed.args[1].toLowerCase() : null;
    let targetUserId: string | null = null;

    if (filterArg && !['bot', 'human', 'embeds', 'links', 'images'].includes(filterArg)) {
      const userRes = await resolveUser(filterArg, guild);
      if (userRes.success) {
        targetUserId = userRes.value.id;
      }
    }

    const textChannel = channel as TextChannel;

    // Delete command invocation message first
    await message.delete().catch(() => {});

    // Fetch recent message history in batches
    let deletedCount = 0;
    let lastId: string | undefined = undefined;

    while (deletedCount < amount) {
      const limit = Math.min(100, (amount - deletedCount) * 2);
      const fetched: Collection<string, Message> = await textChannel.messages.fetch({ limit, before: lastId }).catch(() => new Map() as any);
      if (fetched.size === 0) break;

      const messages = Array.from(fetched.values());
      lastId = messages[messages.length - 1].id;

      // Filter messages
      const FourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const eligible = messages.filter(m => {
        if (m.createdTimestamp < FourteenDaysAgo) return false;
        if (targetUserId) return m.author.id === targetUserId;
        if (!filterArg) return true;
        switch (filterArg) {
          case 'bot': return m.author.bot;
          case 'human': return !m.author.bot;
          case 'embeds': return m.embeds.length > 0;
          case 'links': return /https?:\/\/\S+/i.test(m.content);
          case 'images': return m.attachments.some(a => a.contentType?.startsWith('image/')) || m.embeds.some(e => e.image || e.thumbnail);
          default: return true;
        }
      }).slice(0, amount - deletedCount);

      if (eligible.length === 0) continue;

      const deleted = await textChannel.bulkDelete(eligible, true).catch(() => null);
      if (!deleted || deleted.size === 0) break;

      deletedCount += deleted.size;
      if (deleted.size < eligible.length) break; // Older than 14 days reached

      // Rate limit backoff pause between bulk delete batches
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const replyMsg = await respond.success(`Purged **${deletedCount}** messages.`);
    setTimeout(() => {
      replyMsg.delete().catch(() => {});
    }, 5000);

    logEvent('info', 'command_execution', `Purge by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      channel: channel.name,
      requestedAmount: amount,
      deletedAmount: deletedCount,
      filter: filterArg ?? 'none',
    });
  },
});

import { PermissionsBitField } from 'discord.js';
import type { Message, TextChannel, Collection } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
import { ui } from '../../core/ui/index.js';
import { LiveProgressTracker, renderProgressBar } from '../../core/utils/ProgressBar.js';

export default defineCommand({
  name: 'purge',
  aliases: ['c', 'clear', 'clean', 'prune'],
  module: 'moderation',
  description: 'Purge recent messages matching an optional user or filter with categorized breakdown.',
  usage: 'purge [@user] <amount> OR purge <amount> [bot|human|@user|embeds|links|images]',
  examples: ['purge @User 50', 'purge 50', 'purge 50 bot', 'purge 100 human', 'purge 50 @User', 'purge 100 embeds'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ReadMessageHistory],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, message, respond, member } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(
        `Usage: \`${parsed.prefix}purge [@user] <amount>\` or \`${parsed.prefix}purge <amount> [bot|human|@user|embeds|links|images]\``,
      );
      return;
    }

    let amount: number;
    let filterArg: string | null = null;

    const firstArg = parsed.args[0];
    const secondArg = parsed.args[1];

    const firstAsNum = parseInt(firstArg, 10);
    const secondAsNum = secondArg ? parseInt(secondArg, 10) : NaN;

    if (!isNaN(firstAsNum) && firstAsNum > 0) {
      // Syntax: purge <amount> [filter/@user]
      amount = firstAsNum;
      filterArg = secondArg ? secondArg.toLowerCase() : null;
    } else if (!isNaN(secondAsNum) && secondAsNum > 0) {
      // Syntax: purge <filter/@user> <amount>
      amount = secondAsNum;
      filterArg = firstArg.toLowerCase();
    } else {
      await respond.error(
        `Usage: \`${parsed.prefix}purge [@user] <amount>\` or \`${parsed.prefix}purge <amount> [bot|human|@user|embeds|links|images]\``,
      );
      return;
    }

    if (amount <= 0 || amount > 500) {
      await respond.error('Please specify a valid purge amount between 1 and 500.');
      return;
    }

    let targetUserId: string | null = null;
    let targetUserTag: string | null = null;

    if (filterArg && !['bot', 'human', 'embeds', 'links', 'images'].includes(filterArg)) {
      const userRes = await resolveUser(filterArg, guild);
      if (userRes.success) {
        targetUserId = userRes.value.id;
        targetUserTag = userRes.value.user.tag;
      } else {
        await respond.error(userRes.error ?? `Could not resolve user or filter: \`${filterArg}\``);
        return;
      }
    }

    const textChannel = channel as TextChannel;
    // Delete command invocation message first
    await message.delete().catch(() => {});

    const displayFilter = targetUserTag ? `@${targetUserTag}` : (filterArg ?? 'none');

    let statusMsg: Message | null = null;
    let tracker: LiveProgressTracker | null = null;

    if (amount > 50) {
      const initialPayload = ui.standard({
        title: 'Purging Messages',
        sections: [`**Progress:** ${renderProgressBar(0, amount)} (0/${amount})\nFilter: \`${displayFilter}\``],
      });
      statusMsg = await textChannel.send({ components: initialPayload.components, flags: initialPayload.flags as any }).catch(() => null);
      if (statusMsg) {
        tracker = new LiveProgressTracker(statusMsg, 'Purge Operations', amount);
      }
    }

    // Categorized breakdown stats
    let deletedCount = 0;
    let botCount = 0;
    let humanCount = 0;
    let attachmentCount = 0;
    let linkCount = 0;

    const batchLimit = 100;
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    let lastMessageId: string | undefined = undefined;

    while (deletedCount < amount) {
      const fetchLimit = filterArg ? batchLimit : Math.min(batchLimit, amount - deletedCount);
      const fetchOptions: { limit: number; before?: string } = { limit: fetchLimit };
      if (lastMessageId) {
        fetchOptions.before = lastMessageId;
      }

      const fetched: Collection<string, Message> = await textChannel.messages.fetch(fetchOptions).catch(() => new Map() as any);
      if (fetched.size === 0) break;

      lastMessageId = fetched.last()?.id;

      const validMessages: Message[] = [];
      for (const m of fetched.values()) {
        if (m.createdTimestamp < fourteenDaysAgo) continue;
        if (filterArg === 'bot' && !m.author.bot) continue;
        if (filterArg === 'human' && m.author.bot) continue;
        if (filterArg === 'embeds' && m.embeds.length === 0) continue;
        if (filterArg === 'links' && !/(https?:\/\/[^\s]+)/g.test(m.content)) continue;
        if (filterArg === 'images' && m.attachments.size === 0) continue;
        if (targetUserId && m.author.id !== targetUserId) continue;

        validMessages.push(m);
        if (deletedCount + validMessages.length >= amount) {
          break;
        }
      }

      if (validMessages.length === 0) {
        // If all fetched messages were older than 14 days, stop scanning further
        if (fetched.some(m => m.createdTimestamp < fourteenDaysAgo)) {
          break;
        }
        if (fetched.size < fetchLimit) {
          break;
        }
        continue;
      }

      // Count message types in this batch
      for (const m of validMessages) {
        if (m.author.bot) botCount++;
        else humanCount++;
        if (m.attachments.size > 0) attachmentCount++;
        if (/(https?:\/\/[^\s]+)/g.test(m.content)) linkCount++;
      }

      const deleted = await textChannel.bulkDelete(validMessages, true).catch(() => null);
      if (!deleted || deleted.size === 0) break;

      deletedCount += deleted.size;
      if (tracker) {
        await tracker.update(deletedCount, `Filter: \`${displayFilter}\``);
      }

      if (deletedCount >= amount || fetched.size < fetchLimit) {
        break;
      }
    }

    if (tracker) {
      await tracker.update(deletedCount, `Filter: \`${displayFilter}\``, true);
    }

    const breakdownText = `Purged **${deletedCount}** message(s) [Users: **${humanCount}** | Bots: **${botCount}** | Media: **${attachmentCount}** | Links: **${linkCount}**] • *(Auto-deleting in 5s)*`;

    if (statusMsg) {
      const finalPayload = ui.standard({
        title: 'Purge Completed',
        text: breakdownText,
      });
      await statusMsg.edit({ components: finalPayload.components, flags: finalPayload.flags as any }).catch(() => {});
      setTimeout(() => {
        statusMsg?.delete().catch(() => {});
      }, 5000);
    } else {
      const replyMsg = await respond.success(breakdownText);
      setTimeout(() => {
        replyMsg.delete().catch(() => {});
      }, 5000);
    }

    logAuditAction({
      guild,
      action: 'Messages Purged',
      executor: member,
      channelName: textChannel.name,
      details: [
        `• **Amount Purged:** ${deletedCount} (Requested: ${amount})`,
        `• **Breakdown:** Users: ${humanCount} | Bots: ${botCount} | Media: ${attachmentCount} | Links: ${linkCount}`,
        `• **Filter:** ${displayFilter}`,
      ],
    });

    logEvent('info', 'command_execution', `Purge by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      channel: channel.name,
      requestedAmount: amount,
      deletedAmount: deletedCount,
      filter: displayFilter,
    });
  },
});

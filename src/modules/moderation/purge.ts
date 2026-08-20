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
  description: 'Purge recent messages matching an optional filter with categorized breakdown.',
  usage: 'purge <amount> [bot|human|@user|embeds|links|images]',
  examples: ['purge 50 bot', 'purge 100 human', 'purge 50 @User', 'purge 100 embeds'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ReadMessageHistory],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, message, respond, member } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}purge <amount> [bot|human|@user|embeds|links|images]\``);
      return;
    }

    const amount = parseInt(parsed.args[0], 10);
    if (isNaN(amount) || amount <= 0 || amount > 500) {
      await respond.error('Please specify a valid purge amount between 1 and 500.');
      return;
    }

    const filterArg = parsed.args[1] ? parsed.args[1].toLowerCase() : null;
    let targetUserId: string | null = null;
    let targetUserTag: string | null = null;

    if (filterArg && !['bot', 'human', 'embeds', 'links', 'images'].includes(filterArg)) {
      const userRes = await resolveUser(filterArg, guild);
      if (userRes.success) {
        targetUserId = userRes.value.id;
        targetUserTag = userRes.value.user.tag;
      }
    }

    const textChannel = channel as TextChannel;
    // Delete command invocation message first
    await message.delete().catch(() => {});

    let statusMsg: Message | null = null;
    let tracker: LiveProgressTracker | null = null;

    if (amount > 50) {
      const initialPayload = ui.standard({
        title: 'Purging Messages',
        sections: [`**Progress:** ${renderProgressBar(0, amount)} (0/${amount})\nFilter: \`${filterArg ?? 'none'}\``],
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

    while (deletedCount < amount) {
      const fetchCount = Math.min(batchLimit, amount - deletedCount);
      const fetched: Collection<string, Message> = await textChannel.messages.fetch({ limit: fetchCount }).catch(() => new Map() as any);
      if (fetched.size === 0) break;

      const validMessages = fetched.filter((m: Message) => {
        if (m.createdTimestamp < fourteenDaysAgo) return false;
        if (filterArg === 'bot') return m.author.bot;
        if (filterArg === 'human') return !m.author.bot;
        if (filterArg === 'embeds') return m.embeds.length > 0;
        if (filterArg === 'links') return /(https?:\/\/[^\s]+)/g.test(m.content);
        if (filterArg === 'images') return m.attachments.size > 0;
        if (targetUserId) return m.author.id === targetUserId;
        return true;
      });

      if (validMessages.size === 0) break;

      // Count message types in this batch
      for (const m of validMessages.values()) {
        if (m.author.bot) botCount++;
        else humanCount++;
        if (m.attachments.size > 0) attachmentCount++;
        if (/(https?:\/\/[^\s]+)/g.test(m.content)) linkCount++;
      }

      const deleted = await textChannel.bulkDelete(validMessages, true).catch(() => null);
      if (!deleted || deleted.size === 0) break;

      deletedCount += deleted.size;
      if (tracker) {
        await tracker.update(deletedCount, `Filter: \`${filterArg ?? 'none'}\``);
      }
    }

    if (tracker) {
      await tracker.update(deletedCount, `Filter: \`${filterArg ?? 'none'}\``, true);
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
        `• **Filter:** ${filterArg ? (targetUserTag ? `User (${targetUserTag})` : filterArg) : 'None'}`,
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
      filter: filterArg ?? 'none',
    });
  },
});

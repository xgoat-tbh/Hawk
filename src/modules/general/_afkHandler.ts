import type { Message, GuildTextBasedChannel } from 'discord.js';
import { removeAfk, getAfk } from '../../core/database/repositories/afkRepo.js';
import {
  buildAfkNoticePayload,
  buildAfkWelcomeBackPayload,
  AFK_ALLOWED_MENTIONS,
} from './afkUI.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

import { removeAfkNickname } from './afkSanitizer.js';

export async function handleAfkMessage(message: Message): Promise<void> {
  if (!message.guild || message.author.bot || message.webhookId || message.system) {
    return;
  }

  const guildId = message.guild.id;
  const authorId = message.author.id;
  const textChannel = message.channel as GuildTextBasedChannel;

  try {
    // 1. Author Return Check
    const afkRecord = getAfk(guildId, authorId);
    if (afkRecord) {
      const elapsedMs = Date.now() - afkRecord.startedAt.getTime();

      // Only clear AFK if at least 5 seconds have elapsed since AFK was set
      // (Prevents the set command message or immediate double-sends from clearing AFK)
      if (elapsedMs >= 5000) {
        const removed = await removeAfk(guildId, authorId);
        if (removed) {
          if (message.member) {
            await removeAfkNickname(message.member);
          }

          const totalDurationMs = Date.now() - removed.startedAt.getTime();
          const welcomePayload = buildAfkWelcomeBackPayload(authorId, totalDurationMs);

          const welcomeMsg = await textChannel.send({
            ...welcomePayload,
            allowedMentions: AFK_ALLOWED_MENTIONS,
          }).catch(() => null);

          if (welcomeMsg) {
            setTimeout(() => {
              welcomeMsg.delete().catch(() => {});
            }, 6000);
          }
        }
      }
    }

    // 2. Mentions & Reply-To AFK Target Check
    const candidateUserIds = new Set<string>();

    // Add explicit user mentions (excluding the author themselves)
    message.mentions.users.forEach((user) => {
      if (user.id !== authorId && !user.bot) {
        candidateUserIds.add(user.id);
      }
    });

    // Add reply-to target user if message is a reply
    if (message.reference?.messageId) {
      try {
        const referencedMsg = message.channel.messages.cache.get(message.reference.messageId)
          ?? await message.channel.messages.fetch(message.reference.messageId).catch(() => null);

        if (referencedMsg && referencedMsg.author && referencedMsg.author.id !== authorId && !referencedMsg.author.bot) {
          candidateUserIds.add(referencedMsg.author.id);
        }
      } catch {
        // Ignore reply resolution failures
      }
    }

    if (candidateUserIds.size === 0) return;

    // Filter candidate IDs for those currently AFK
    const afkUsers: { userId: string; reason: string; startedAt: Date }[] = [];
    candidateUserIds.forEach((targetId) => {
      const record = getAfk(guildId, targetId);
      if (record) {
        afkUsers.push({
          userId: targetId,
          reason: record.reason,
          startedAt: record.startedAt,
        });
      }
    });

    if (afkUsers.length === 0) return;

    // Build single combined Components V2 notice payload
    const noticePayload = buildAfkNoticePayload(afkUsers);
    const noticeMsg = await textChannel.send({
      ...noticePayload,
      allowedMentions: AFK_ALLOWED_MENTIONS,
    }).catch(() => null);

    if (noticeMsg) {
      setTimeout(() => {
        noticeMsg.delete().catch(() => {});
      }, 6000);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    consoleLog('error', 'afk_handler', `Error processing AFK in message ${message.id}: ${msg}`);
  }
}

import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { updateSuggestionStatus, updateSuggestionMessageId } from '../../core/database/repositories/suggestionRepo.js';
import { buildSuggestionPayload, resolveSuggestionTarget } from './suggestionUI.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'deny',
  module: 'suggestion',
  description: 'Deny a suggestion.',
  usage: 'deny <number|messageId|url> [reason...]',
  examples: ['deny 42 Not feasible at this time', 'deny #001', 'deny 123456789012345678'],
  permissions: [PermissionsBitField.Flags.ManageGuild],
  botPermissions: [],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, message } = ctx;
    const prefix = parsed.prefix;

    const suggestion = await resolveSuggestionTarget(parsed.args[0] ?? '', guild.id, message);
    if (!suggestion) {
      await respond.error(`Usage: \`${prefix}deny <number|messageId|url> [reason...]\` or reply to a suggestion message.`);
      return;
    }

    let reason = '';
    const firstArg = parsed.args[0];
    const isFirstArgTarget = firstArg && (
      firstArg.startsWith('#') ||
      /^\d+$/.test(firstArg) ||
      firstArg.includes('discord.com/channels')
    );

    if (isFirstArgTarget) {
      reason = parsed.args.slice(1).join(' ').trim();
    } else {
      reason = parsed.args.join(' ').trim();
    }

    const updated = await updateSuggestionStatus(suggestion.id, 'denied', member.id);
    if (!updated) {
      await respond.error('Failed to update suggestion status.');
      return;
    }

    const v2Payload = buildSuggestionPayload(updated, undefined, reason);

    // Update existing Discord message in suggestion channel
    const channel = (await guild.channels.fetch(updated.channelId).catch(() => null)) as GuildTextBasedChannel | null;
    if (channel) {
      let msg = await channel.messages.fetch(updated.messageId).catch(() => null);
      if (!msg) {
        const recentMsgs = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (recentMsgs) {
          const match = recentMsgs.find(m =>
            m.author.id === guild.client.user?.id &&
            (m.content.includes(`Suggestion #${updated.number}`) || JSON.stringify(m.components).includes(`Suggestion #${updated.number}`))
          );
          if (match) {
            msg = match;
            await updateSuggestionMessageId(updated.id, match.id).catch(() => {});
          }
        }
      }

      if (msg) {
        await msg.edit({ components: v2Payload.components }).catch(() => {});
      }
    }

    // Direct Message notification to suggestion author
    const authorUser = await guild.client.users.fetch(updated.authorId).catch(() => null);
    if (authorUser) {
      const dmPayload = buildV2Container({
        text: `🔴 **Suggestion Denied**`,
        sections: [
          `Your suggestion **#${updated.number}** in **${guild.name}** has been **DENIED**.`,
          `**Suggestion Content:**\n${updated.content}`,
          ...(reason ? [`**Comment/Reason:**\n${reason}`] : []),
        ],
      });
      await authorUser.send(dmPayload).catch(() => {});
    }

    await respond.success(`Suggestion **#${String(updated.number).padStart(3, '0')}** has been denied.`);

    logEvent('info', 'command_execution', `Suggestion #${updated.number} denied by staff ${member.user.tag}`, {
      staff: member.user.tag,
      staffId: member.id,
      guild: guild.name,
      guildId: guild.id,
      suggestionId: updated.id,
      number: updated.number,
      reason,
    });
  },
});

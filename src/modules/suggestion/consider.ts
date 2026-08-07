import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { updateSuggestionStatus, updateSuggestionMessageId } from '../../core/database/repositories/suggestionRepo.js';
import { buildSuggestionPayload, resolveSuggestionTarget } from './suggestionUI.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'consider',
  module: 'suggestion',
  description: 'Mark a suggestion as under consideration.',
  usage: 'consider <number|messageId|url> [reason...]',
  examples: ['consider 42 Under review by dev team', 'consider #001', 'consider 123456789012345678'],
  permissions: [PermissionsBitField.Flags.ManageGuild],
  botPermissions: [],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;
    const prefix = parsed.prefix;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${prefix}consider <number|messageId|url> [reason...]\``);
      return;
    }

    const suggestion = await resolveSuggestionTarget(parsed.args[0], guild.id);
    if (!suggestion) {
      await respond.error(`Could not resolve a suggestion matching \`${parsed.args[0]}\`.`);
      return;
    }

    const reason = parsed.args.slice(1).join(' ').trim();

    const updated = await updateSuggestionStatus(suggestion.id, 'considered', member.id);
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
        await msg.edit(v2Payload).catch(() => {});
      }
    }

    // Direct Message notification to suggestion author
    const authorUser = await guild.client.users.fetch(updated.authorId).catch(() => null);
    if (authorUser) {
      const dmPayload = buildV2Container({
        text: `🟡 **Suggestion Under Consideration**`,
        sections: [
          `Your suggestion **#${updated.number}** in **${guild.name}** is now **UNDER CONSIDERATION**.`,
          `**Suggestion Content:**\n${updated.content}`,
          ...(reason ? [`**Comment/Reason:**\n${reason}`] : []),
        ],
      });
      await authorUser.send(dmPayload).catch(() => {});
    }

    await respond.success(`Suggestion **#${String(updated.number).padStart(3, '0')}** marked as under consideration.`);

    logEvent('info', 'command_execution', `Suggestion #${updated.number} considered by staff ${member.user.tag}`, {
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

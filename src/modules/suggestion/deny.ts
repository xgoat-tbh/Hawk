import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { updateSuggestionStatus } from '../../core/database/repositories/suggestionRepo.js';
import { buildSuggestionEmbed, resolveSuggestionTarget } from './suggestionUI.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'deny',
  module: 'suggestion',
  description: 'Deny a suggestion.',
  usage: 'deny <number|messageId|url>',
  examples: ['deny 42', 'deny #001', 'deny 123456789012345678'],
  permissions: [PermissionsBitField.Flags.ManageGuild],
  botPermissions: [],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;

    if (parsed.args.length === 0) {
      await respond.error('Usage: `?deny <number|messageId|url>`');
      return;
    }

    const suggestion = await resolveSuggestionTarget(parsed.args[0], guild.id);
    if (!suggestion) {
      await respond.error(`Could not resolve a suggestion matching \`${parsed.args[0]}\`.`);
      return;
    }

    const updated = await updateSuggestionStatus(suggestion.id, 'denied', member.id);
    if (!updated) {
      await respond.error('Failed to update suggestion status.');
      return;
    }

    const embed = buildSuggestionEmbed(updated);

    // Update existing Discord message embed
    const channel = (await guild.channels.fetch(updated.channelId).catch(() => null)) as GuildTextBasedChannel | null;
    if (channel) {
      const msg = await channel.messages.fetch(updated.messageId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed] }).catch(() => {});
      }
    }

    await respond.success(`Suggestion **#${String(updated.number).padStart(3, '0')}** has been denied.`);

    logEvent('info', 'command_execution', `Suggestion #${updated.number} denied by staff ${member.user.tag}`, {
      staff: member.user.tag,
      staffId: member.id,
      guild: guild.name,
      guildId: guild.id,
      suggestionId: updated.id,
      number: updated.number,
    });
  },
});

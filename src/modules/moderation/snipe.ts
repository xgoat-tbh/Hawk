import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSnipe } from './SnipeManager.js';
import { branding } from '../../core/config/branding.js';

export default defineCommand({
  name: 'snipe',
  aliases: ['s', 'snip'],
  module: 'moderation',
  description: 'Retrieve the most recently deleted message in this channel.',
  usage: 'snipe',
  examples: ['snipe'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { channel, respond } = ctx;

    const snipe = getSnipe(channel.id);
    if (!snipe) {
      await respond.info('There are no recently deleted messages to snipe in this channel.');
      return;
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: snipe.authorTag })
      .setDescription(snipe.content || '[No Text Content]')
      .setColor(branding.defaultColor)
      .setTimestamp(snipe.deletedAt);

    if (snipe.attachments.length > 0) {
      embed.addFields({ name: 'Attachments', value: snipe.attachments.join('\n') });
    }

    await respond.raw({ embeds: [embed] });
  },
});

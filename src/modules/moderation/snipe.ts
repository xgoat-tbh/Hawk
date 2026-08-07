import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSnipe } from './SnipeManager.js';

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
      .setAuthor({ name: snipe.authorTag, iconURL: snipe.authorAvatar })
      .setDescription(snipe.content || '[No Text Content]')
      .setTimestamp(snipe.deletedAt);

    if (snipe.attachments.length > 0) {
      embed.addFields({ name: 'Attachments', value: snipe.attachments.join('\n') });
      const firstImg = snipe.attachments.find(url => /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url));
      if (firstImg) {
        embed.setImage(firstImg);
      }
    }

    await respond.raw({ embeds: [embed] });
  },
});

import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSnipe } from './SnipeManager.js';
import { HawkTheme } from '../../core/ui/theme.js';

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

    const unixTimestamp = Math.floor(snipe.deletedAt.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(HawkTheme.colors.primary)
      .setAuthor({
        name: `${snipe.authorTag} (${snipe.authorId})`,
        iconURL: snipe.authorAvatar,
      })
      .setDescription(
        `**Author:** **${snipe.authorTag}** (\`${snipe.authorId}\`)\n` +
        `**Deleted:** <t:${unixTimestamp}:R> (<t:${unixTimestamp}:T>)\n\n` +
        (snipe.content ? snipe.content : '*[No text content]*')
      );

    if (snipe.attachments.length > 0) {
      embed.addFields({
        name: `Attachments [${snipe.attachments.length}]`,
        value: snipe.attachments.map((url, i) => `[Attachment ${i + 1}](${url})`).join(' • '),
      });

      const firstImg = snipe.attachments.find((url) => /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url));
      if (firstImg) {
        embed.setImage(firstImg);
      }
    }

    await respond.raw({
      embeds: [embed],
    });
  },
});

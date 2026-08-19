import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSnipe } from './SnipeManager.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { ui } from '../../core/ui/index.js';

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
    const sections: string[] = [];

    sections.push(`**Author:** ${mentionUser(snipe.authorId)} (\`${snipe.authorTag}\`)\n**Deleted:** <t:${unixTimestamp}:R> (<t:${unixTimestamp}:T>)`);
    sections.push(snipe.content || '*[No text content]*');

    if (snipe.attachments.length > 0) {
      sections.push(
        `**Attachments (${snipe.attachments.length}):**\n` +
        snipe.attachments.map((url, i) => `[Attachment ${i + 1}](${url})`).join(' • ')
      );
    }

    const payload = ui.standard({
      title: 'Deleted Message Snipe',
      sections,
    });

    await respond.raw({
      components: payload.components,
      flags: payload.flags as any,
    });
  },
});

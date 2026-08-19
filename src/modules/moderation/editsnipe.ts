import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getEditSnipe } from './SnipeManager.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { ui } from '../../core/ui/index.js';

export default defineCommand({
  name: 'editsnipe',
  aliases: ['es', 'esnipe'],
  module: 'moderation',
  description: 'Retrieve the most recently edited message in this channel.',
  usage: 'editsnipe',
  examples: ['editsnipe'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { channel, respond } = ctx;

    const editSnipe = getEditSnipe(channel.id);
    if (!editSnipe) {
      await respond.info('There are no recently edited messages to snipe in this channel.');
      return;
    }

    const unixTimestamp = Math.floor(editSnipe.editedAt.getTime() / 1000);
    const sections: string[] = [];

    sections.push(`**Author:** ${mentionUser(editSnipe.authorId)} (\`${editSnipe.authorTag}\`)\n**Edited:** <t:${unixTimestamp}:R> (<t:${unixTimestamp}:T>)`);
    sections.push(`**Before:**\n${editSnipe.oldContent}`);
    sections.push(`**After:**\n${editSnipe.newContent}`);

    if (editSnipe.attachments.length > 0) {
      sections.push(
        `**Attachments (${editSnipe.attachments.length}):**\n` +
        editSnipe.attachments.map((url, i) => `[Attachment ${i + 1}](${url})`).join(' • ')
      );
    }

    const payload = ui.standard({
      title: 'Edited Message Snipe',
      sections,
    });

    await respond.raw({
      components: payload.components,
      flags: payload.flags as any,
    });
  },
});

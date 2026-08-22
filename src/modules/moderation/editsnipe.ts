import {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getEditSnipes, type EditSnipeData } from './SnipeManager.js';
import { ui, type ComponentV2Payload } from '../../core/ui/index.js';

function buildEditSnipePayload(editSnipe: EditSnipeData, currentIndex: number, total: number): ComponentV2Payload {
  const unixTimestamp = Math.floor(editSnipe.editedAt.getTime() / 1000);
  const sections: string[] = [];

  sections.push(`**Author:** **${editSnipe.authorTag}** (\`${editSnipe.authorId}\`)\n**Edited:** <t:${unixTimestamp}:R> (<t:${unixTimestamp}:T>)`);
  sections.push(`**Before:**\n${editSnipe.oldContent}`);
  sections.push(`**After:**\n${editSnipe.newContent}`);

  if (editSnipe.attachments.length > 0) {
    sections.push(
      `**Attachments (${editSnipe.attachments.length}):**\n` +
      editSnipe.attachments.map((url, i) => `[Attachment ${i + 1}](${url})`).join(' • ')
    );
  }

  return ui.standard({
    title: `Edited Message ${currentIndex + 1} of ${total}`,
    sections,
  });
}

function buildEditSnipeButtons(currentIndex: number, total: number): ActionRowBuilder<ButtonBuilder> {
  const prevBtn = new ButtonBuilder()
    .setCustomId('esnipe_prev')
    .setLabel('◀ Prev')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentIndex <= 0);

  const countBtn = new ButtonBuilder()
    .setCustomId('esnipe_count')
    .setLabel(`${currentIndex + 1} / ${total}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextBtn = new ButtonBuilder()
    .setCustomId('esnipe_next')
    .setLabel('Next ▶')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentIndex >= total - 1);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, countBtn, nextBtn);
}

export default defineCommand({
  name: 'editsnipe',
  aliases: ['es', 'esnipe', 'editsnipes'],
  module: 'moderation',
  description: 'Retrieve recently edited messages in this channel with multi-message history navigation.',
  usage: 'editsnipe [index|list]',
  examples: ['editsnipe', 'editsnipe 2', 'editsnipe list'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { channel, parsed, member, respond } = ctx;

    const snipes = getEditSnipes(channel.id);
    if (snipes.length === 0) {
      await respond.info('There are no recently edited messages to snipe in this channel (or all records have expired after 30m).');
      return;
    }

    const firstArg = parsed.args[0]?.toLowerCase();

    // ── Subcommand: list / history ──
    if (firstArg === 'list' || firstArg === 'history') {
      const lines = snipes.map((s, i) => {
        const time = Math.floor(s.editedAt.getTime() / 1000);
        const snippet = s.newContent ? (s.newContent.length > 50 ? s.newContent.slice(0, 47) + '...' : s.newContent) : '[No Text Content]';
        const attachStr = s.attachments.length > 0 ? ` • \`[${s.attachments.length} attachment(s)]\`` : '';
        return `\`${i + 1}.\` **${s.authorTag}** (<t:${time}:R>): "${snippet}"${attachStr}`;
      });

      await ui.paginated(ctx, {
        title: `Edited Message History (${snipes.length})`,
        items: lines,
        pageSize: 8,
        emptyText: 'No edited messages recorded.',
      });
      return;
    }

    // ── Direct index or latest message ──
    let initialIndex = 0;
    if (firstArg && /^\d+$/.test(firstArg)) {
      const parsedNum = parseInt(firstArg, 10);
      if (parsedNum >= 1 && parsedNum <= snipes.length) {
        initialIndex = parsedNum - 1;
      } else {
        await respond.warning(`Invalid index. Available range: **1 to ${snipes.length}**.`);
        return;
      }
    }

    let currentIndex = initialIndex;
    const initialPayload = buildEditSnipePayload(snipes[currentIndex], currentIndex, snipes.length);

    if (snipes.length === 1) {
      await respond.raw({
        components: initialPayload.components,
        flags: initialPayload.flags as any,
      });
      return;
    }

    const initialRow = buildEditSnipeButtons(currentIndex, snipes.length);
    const sentMsg = await respond.raw({
      components: [...initialPayload.components, initialRow],
      flags: initialPayload.flags as any,
    });

    const collector = sentMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === member.id,
      time: 90000,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'esnipe_prev') {
        if (currentIndex > 0) currentIndex--;
      } else if (interaction.customId === 'esnipe_next') {
        if (currentIndex < snipes.length - 1) currentIndex++;
      }

      const updatedPayload = buildEditSnipePayload(snipes[currentIndex], currentIndex, snipes.length);
      const updatedRow = buildEditSnipeButtons(currentIndex, snipes.length);

      await interaction.update({
        components: [...updatedPayload.components, updatedRow],
        flags: updatedPayload.flags as any,
      });
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('esnipe_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('esnipe_count').setLabel(`${currentIndex + 1} / ${snipes.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('esnipe_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true),
      );
      sentMsg.edit({ components: disabledRow.components.length > 0 ? [disabledRow] : [] }).catch(() => {});
    });
  },
});

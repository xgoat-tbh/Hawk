import {
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { getSnipes, type SnipeData } from './SnipeManager.js';
import { HawkTheme } from '../../core/ui/theme.js';
import { ui } from '../../core/ui/index.js';

function buildSnipeEmbed(snipe: SnipeData, currentIndex: number, total: number): EmbedBuilder {
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
    )
    .setFooter({
      text: `Deleted Message ${currentIndex + 1} of ${total} • Auto-expires after 30m`,
    });

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

  return embed;
}

function buildSnipeButtons(currentIndex: number, total: number): ActionRowBuilder<ButtonBuilder> {
  const prevBtn = new ButtonBuilder()
    .setCustomId('snipe_prev')
    .setLabel('◀ Prev')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentIndex <= 0);

  const countBtn = new ButtonBuilder()
    .setCustomId('snipe_count')
    .setLabel(`${currentIndex + 1} / ${total}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextBtn = new ButtonBuilder()
    .setCustomId('snipe_next')
    .setLabel('Next ▶')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentIndex >= total - 1);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, countBtn, nextBtn);
}

export default defineCommand({
  name: 'snipe',
  aliases: ['s', 'snip', 'snipes'],
  module: 'moderation',
  description: 'Retrieve recently deleted messages in this channel with multi-message history navigation.',
  usage: 'snipe [index|list]',
  examples: ['snipe', 'snipe 2', 'snipe list'],
  permissions: [PermissionsBitField.Flags.ManageMessages],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { channel, parsed, member, respond } = ctx;

    const snipes = getSnipes(channel.id);
    if (snipes.length === 0) {
      await respond.info('There are no recently deleted messages to snipe in this channel (or all records have expired after 30m).');
      return;
    }

    const firstArg = parsed.args[0]?.toLowerCase();

    // ── Subcommand: list / history ──
    if (firstArg === 'list' || firstArg === 'history') {
      const lines = snipes.map((s, i) => {
        const time = Math.floor(s.deletedAt.getTime() / 1000);
        const snippet = s.content ? (s.content.length > 50 ? s.content.slice(0, 47) + '...' : s.content) : '[No Text Content]';
        const attachStr = s.attachments.length > 0 ? ` • \`[${s.attachments.length} attachment(s)]\`` : '';
        return `\`${i + 1}.\` **${s.authorTag}** (<t:${time}:R>): "${snippet}"${attachStr}`;
      });

      await ui.paginated(ctx, {
        title: `Deleted Message History (${snipes.length})`,
        items: lines,
        pageSize: 8,
        emptyText: 'No deleted messages recorded.',
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
    const initialEmbed = buildSnipeEmbed(snipes[currentIndex], currentIndex, snipes.length);

    if (snipes.length === 1) {
      await respond.raw({ embeds: [initialEmbed] });
      return;
    }

    const initialRow = buildSnipeButtons(currentIndex, snipes.length);
    const sentMsg = await respond.raw({
      embeds: [initialEmbed],
      components: [initialRow],
    });

    const collector = sentMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === member.id,
      time: 90000,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'snipe_prev') {
        if (currentIndex > 0) currentIndex--;
      } else if (interaction.customId === 'snipe_next') {
        if (currentIndex < snipes.length - 1) currentIndex++;
      }

      const updatedEmbed = buildSnipeEmbed(snipes[currentIndex], currentIndex, snipes.length);
      const updatedRow = buildSnipeButtons(currentIndex, snipes.length);

      await interaction.update({
        embeds: [updatedEmbed],
        components: [updatedRow],
      });
    });

    collector.on('end', () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('snipe_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('snipe_count').setLabel(`${currentIndex + 1} / ${snipes.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('snipe_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(true),
      );
      sentMsg.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
});

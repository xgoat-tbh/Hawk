import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import type { Message, GuildTextBasedChannel } from 'discord.js';
import type { CommandContext } from '../../types/command.js';
import { sanitize } from './validators.js';

export interface ComponentV2Options {
  accentColor?: number;
  text?: string;
  sections?: string[];
  components?: ActionRowBuilder<any>[];
  divider?: boolean;
}

export interface ComponentV2Payload {
  components: ContainerBuilder[];
  flags: number;
}

export interface PaginatedV2Options {
  title: string;
  items: string[];
  pageSize?: number;
  accentColor?: number;
  emptyText?: string;
  timeoutMs?: number;
}

export function buildV2Container(options: ComponentV2Options): ComponentV2Payload {
  const container = new ContainerBuilder();
  if (options.accentColor !== undefined) {
    container.setAccentColor(options.accentColor);
  }

  if (options.text) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(options.text));
  }

  if (options.sections && options.sections.length > 0) {
    for (let i = 0; i < options.sections.length; i++) {
      if (i > 0 || options.text) {
        if (options.divider !== false) {
          container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        }
      }
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(options.sections[i]));
    }
  }

  if (options.components && options.components.length > 0) {
    if (options.divider !== false && (options.text || (options.sections && options.sections.length > 0))) {
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    }
    for (const row of options.components) {
      container.addActionRowComponents(row);
    }
  }

  return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

export async function sendPaginatedV2Container(
  ctx: CommandContext,
  options: PaginatedV2Options,
): Promise<Message> {
  const { channel, member, guild } = ctx;
  const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 10;
  const timeoutMs = options.timeoutMs ?? 120_000;

  const title = sanitize(options.title, guild);
  const emptyText = sanitize(options.emptyText ?? 'No items found.', guild);
  const items = options.items.map((it) => sanitize(it, guild));
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  function buildPagePayload(page: number, disabled = false): ComponentV2Payload {
    if (items.length === 0) {
      return buildV2Container({
        text: title,
        sections: [emptyText],
        accentColor: options.accentColor,
      });
    }

    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    const content = `${pageItems.join('\n')}\n\n*Page ${page}/${totalPages} (Total: ${items.length})*`;

    let buttonRow: ActionRowBuilder<ButtonBuilder> | undefined;
    if (totalPages > 1) {
      buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`v2_prev_${page}`)
          .setLabel('◀ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || page <= 1),
        new ButtonBuilder()
          .setCustomId(`v2_page_indicator`)
          .setLabel(`${page} / ${totalPages}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`v2_next_${page}`)
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || page >= totalPages),
      );
    }

    return buildV2Container({
      text: title,
      sections: [content],
      components: buttonRow ? [buttonRow] : undefined,
      accentColor: options.accentColor,
    });
  }

  const textChannel = channel as GuildTextBasedChannel;
  let currentPage = 1;
  const initialPayload = buildPagePayload(currentPage);

  const sentMsg = await textChannel.send({
    components: initialPayload.components,
    flags: initialPayload.flags,
    allowedMentions: { parse: [], roles: [], users: [], repliedUser: false },
  });

  if (totalPages <= 1) {
    return sentMsg;
  }

  const collector = sentMsg.createMessageComponentCollector({
    time: timeoutMs,
  });

  collector.on('collect', async (i) => {
    if (i.user.id !== member.id) {
      await i.reply({
        content: 'Only the command executor can switch pages.',
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
      return;
    }

    if (i.customId.startsWith('v2_prev_')) {
      currentPage = Math.max(1, currentPage - 1);
    } else if (i.customId.startsWith('v2_next_')) {
      currentPage = Math.min(totalPages, currentPage + 1);
    } else {
      return;
    }

    const nextPayload = buildPagePayload(currentPage);
    await i.update({
      components: nextPayload.components,
      flags: nextPayload.flags,
    }).catch(() => {});
  });

  collector.on('end', async () => {
    const finalPayload = buildPagePayload(currentPage, true);
    await sentMsg.edit({
      components: finalPayload.components,
      flags: finalPayload.flags,
    }).catch(() => {});
  });

  return sentMsg;
}

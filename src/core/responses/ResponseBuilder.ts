import { EmbedBuilder } from 'discord.js';
import type { Message, MessageCreateOptions, GuildTextBasedChannel } from 'discord.js';
import { branding, getEmoji, toReactableEmoji } from '../config/branding.js';
import { sanitize, truncate } from '../utils/validators.js';

const SAFE_ALLOWED_MENTIONS = {
  parse: [] as [],
  users: [] as string[],
  roles: [] as string[],
  repliedUser: false,
} as const;

export class ResponseBuilder {
  private autoCleanEnabled = false;
  private autoCleanDelayMs = 7000;

  constructor(private readonly message: Message) {}

  enableAutoClean(delayMs = 7000): this {
    this.autoCleanEnabled = true;
    this.autoCleanDelayMs = delayMs;
    return this;
  }

  private scheduleClean(msg: Message | null): void {
    if (this.autoCleanEnabled) {
      this.message.delete().catch(() => {});
      if (msg && typeof msg.delete === 'function') {
        setTimeout(() => {
          msg.delete().catch(() => {});
        }, this.autoCleanDelayMs);
      }
    }
  }

  async success(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: `${getEmoji('success')} ${sanitize(text)}`,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async error(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: `${getEmoji('error')} ${sanitize(text)}`,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async warning(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: `${getEmoji('warning')} ${sanitize(text)}`,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async info(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: `${getEmoji('info')} ${sanitize(text)}`,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async denied(text?: string): Promise<Message | null> {
    const rawEmoji = getEmoji('denied');
    const reactEmoji = toReactableEmoji(rawEmoji, '🚫');

    if (this.message?.react) {
      const reaction = await this.message.react(reactEmoji).catch(() => null);
      if (reaction) return this.message;
    }

    if (text) {
      const sent = await this.sendableChannel.send({
        content: `${rawEmoji} ${sanitize(text)}`,
        allowedMentions: SAFE_ALLOWED_MENTIONS,
      });
      this.scheduleClean(sent);
      return sent;
    }

    return null;
  }

  async send(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: sanitize(text),
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async embed(options: {
    title?: string;
    description?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: string;
    thumbnail?: string;
  }): Promise<Message> {
    const embed = new EmbedBuilder().setColor(options.color ?? branding.defaultColor);
    if (options.title) embed.setTitle(sanitize(options.title));
    if (options.description) embed.setDescription(truncate(sanitize(options.description), 4000));
    if (options.footer || branding.footerText) embed.setFooter({ text: sanitize(options.footer ?? branding.footerText) });
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.fields) {
      for (const field of options.fields) {
        embed.addFields({
          name: truncate(sanitize(field.name), 256),
          value: truncate(sanitize(field.value), 1024),
          inline: field.inline,
        });
      }
    }
    const sent = await this.sendableChannel.send({ embeds: [embed], allowedMentions: SAFE_ALLOWED_MENTIONS });
    this.scheduleClean(sent);
    return sent;
  }

  async raw(options: MessageCreateOptions): Promise<Message> {
    const sent = await this.sendableChannel.send({
      ...options,
      allowedMentions: options.allowedMentions ?? SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async reply(text: string): Promise<Message> {
    const sent = await this.message.reply({
      content: sanitize(text),
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  private get sendableChannel(): GuildTextBasedChannel {
    return this.message.channel as GuildTextBasedChannel;
  }
}

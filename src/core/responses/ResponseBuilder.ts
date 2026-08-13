import { EmbedBuilder } from 'discord.js';
import type { Message, MessageCreateOptions, GuildTextBasedChannel } from 'discord.js';
import { branding, getEmoji, toReactableEmoji } from '../config/branding.js';
import { sanitize, truncate } from '../utils/validators.js';
import { buildV2Container } from '../utils/componentsV2.js';
import type { ComponentV2Options } from '../utils/componentsV2.js';

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

  private scheduleClean(msg: Message | null, forceClean = false): void {
    if (this.autoCleanEnabled || forceClean) {
      this.message.delete().catch(() => {});
      if (msg && typeof msg.delete === 'function') {
        setTimeout(() => {
          msg.delete().catch(() => {});
        }, this.autoCleanDelayMs);
      }
    }
  }

  private cleanSanitize(text: string): string {
    return sanitize(text, this.message.guild);
  }

  async success(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: `${getEmoji('success')} ${this.cleanSanitize(text)}`,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async error(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: `${getEmoji('error')} ${this.cleanSanitize(text)}`,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent, true);
    return sent;
  }

  async warning(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: `${getEmoji('warning')} ${this.cleanSanitize(text)}`,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent, true);
    return sent;
  }

  async info(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: `${getEmoji('info')} ${this.cleanSanitize(text)}`,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async denied(text?: string): Promise<Message | null> {
    const rawEmoji = getEmoji('denied');
    const reactEmoji = toReactableEmoji(rawEmoji, '');

    if (this.message?.react) {
      const reaction = await this.message.react(reactEmoji).catch(() => null);
      if (reaction) return this.message;
    }

    if (text) {
      const sent = await this.sendableChannel.send({
        content: `${rawEmoji} ${this.cleanSanitize(text)}`,
        allowedMentions: SAFE_ALLOWED_MENTIONS,
      });
      this.scheduleClean(sent);
      return sent;
    }

    return null;
  }

  async send(text: string): Promise<Message> {
    const sent = await this.sendableChannel.send({
      content: this.cleanSanitize(text),
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
    const embed = new EmbedBuilder();
    if (options.color !== undefined) {
      embed.setColor(options.color);
    }
    if (options.title) embed.setTitle(this.cleanSanitize(options.title));
    if (options.description) embed.setDescription(truncate(this.cleanSanitize(options.description), 4000));
    if (options.footer || branding.footerText) embed.setFooter({ text: this.cleanSanitize(options.footer ?? branding.footerText) });
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.fields) {
      for (const field of options.fields) {
        embed.addFields({
          name: truncate(this.cleanSanitize(field.name), 256),
          value: truncate(this.cleanSanitize(field.value), 1024),
          inline: field.inline,
        });
      }
    }
    const sent = await this.sendableChannel.send({ embeds: [embed], allowedMentions: SAFE_ALLOWED_MENTIONS });
    this.scheduleClean(sent);
    return sent;
  }

  async v2Container(options: ComponentV2Options): Promise<Message> {
    const payload = buildV2Container(options);
    const sent = await this.sendableChannel.send({
      components: payload.components,
      flags: payload.flags,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
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
      content: this.cleanSanitize(text),
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  private get sendableChannel(): GuildTextBasedChannel {
    return this.message.channel as GuildTextBasedChannel;
  }
}

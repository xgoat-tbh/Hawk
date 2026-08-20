import type { Message, MessageCreateOptions, GuildTextBasedChannel } from 'discord.js';
import { sanitize } from '../utils/validators.js';
import { ui } from '../ui/index.js';
import type { StandardLayoutOptions } from '../ui/layouts.js';
import { getEmoji } from '../config/branding.js';

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
    const emoji = getEmoji('success');
    const prefix = emoji ? `${emoji} ` : '';
    const formatted = `> ${prefix}${this.cleanSanitize(text)}`;
    const sent = await this.sendableChannel.send({
      content: formatted,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async transientSuccess(text: string, delayMs = 5000): Promise<Message> {
    this.enableAutoClean(delayMs);
    return this.success(text);
  }

  async transientInfo(text: string, delayMs = 5000): Promise<Message> {
    this.enableAutoClean(delayMs);
    return this.info(text);
  }

  async error(text: string): Promise<Message> {
    const emoji = getEmoji('error');
    const prefix = emoji ? `${emoji} ` : '';
    const formatted = `> ${prefix}**Error:** ${this.cleanSanitize(text)}`;
    const sent = await this.sendableChannel.send({
      content: formatted,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent, true);
    return sent;
  }

  async warning(text: string): Promise<Message> {
    const emoji = getEmoji('warning');
    const prefix = emoji ? `${emoji} ` : '';
    const formatted = `> ${prefix}**Notice:** ${this.cleanSanitize(text)}`;
    const sent = await this.sendableChannel.send({
      content: formatted,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent, true);
    return sent;
  }

  async info(text: string): Promise<Message> {
    const emoji = getEmoji('info');
    const prefix = emoji ? `${emoji} ` : '';
    const formatted = `> ${prefix}${this.cleanSanitize(text)}`;
    const sent = await this.sendableChannel.send({
      content: formatted,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async denied(text?: string): Promise<Message | null> {
    if (text) {
      const emoji = getEmoji('denied');
      const prefix = emoji ? `${emoji} ` : '';
      const formatted = `> ${prefix}**Access Denied:** ${this.cleanSanitize(text)}`;
      const sent = await this.sendableChannel.send({
        content: formatted,
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

  async v2Container(options: StandardLayoutOptions): Promise<Message> {
    const payload = ui.standard(options);
    const sent = await this.sendableChannel.send({
      components: payload.components,
      flags: payload.flags as any,
      allowedMentions: SAFE_ALLOWED_MENTIONS,
    });
    this.scheduleClean(sent);
    return sent;
  }

  async v2(options: StandardLayoutOptions): Promise<Message> {
    return this.v2Container(options);
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

import { sanitize } from '../utils/validators.js';
import { ui } from '../ui/index.js';
import { getEmoji } from '../config/branding.js';
const SAFE_ALLOWED_MENTIONS = {
    parse: [],
    users: [],
    roles: [],
    repliedUser: false,
};
export class ResponseBuilder {
    message;
    autoCleanEnabled = false;
    autoCleanDelayMs = 7000;
    lastOutcome = null;
    lastSnippet = null;
    constructor(message) {
        this.message = message;
    }
    getLastOutcome() {
        return this.lastOutcome;
    }
    getLastSnippet() {
        return this.lastSnippet;
    }
    enableAutoClean(delayMs = 7000) {
        this.autoCleanEnabled = true;
        this.autoCleanDelayMs = delayMs;
        return this;
    }
    scheduleClean(msg, forceClean = false) {
        if (this.autoCleanEnabled || forceClean) {
            this.message.delete().catch(() => { });
            if (msg && typeof msg.delete === 'function') {
                setTimeout(() => {
                    msg.delete().catch(() => { });
                }, this.autoCleanDelayMs);
            }
        }
    }
    cleanSanitize(text) {
        return sanitize(text, this.message.guild);
    }
    async success(text) {
        this.lastOutcome = 'success';
        this.lastSnippet = text;
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
    async transientSuccess(text, delayMs = 5000) {
        this.enableAutoClean(delayMs);
        return this.success(text);
    }
    async transientWarning(text, delayMs = 5000) {
        this.enableAutoClean(delayMs);
        return this.warning(text);
    }
    async transientInfo(text, delayMs = 5000) {
        this.enableAutoClean(delayMs);
        return this.info(text);
    }
    async error(text) {
        this.lastOutcome = 'error';
        this.lastSnippet = text;
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
    async warning(text) {
        this.lastOutcome = 'warning';
        this.lastSnippet = text;
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
    async info(text) {
        this.lastOutcome = 'info';
        this.lastSnippet = text;
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
    async denied(text) {
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
    async send(text) {
        const sent = await this.sendableChannel.send({
            content: this.cleanSanitize(text),
            allowedMentions: SAFE_ALLOWED_MENTIONS,
        });
        this.scheduleClean(sent);
        return sent;
    }
    async v2Container(options) {
        const payload = ui.standard(options);
        const sent = await this.sendableChannel.send({
            components: payload.components,
            flags: payload.flags,
            allowedMentions: SAFE_ALLOWED_MENTIONS,
        });
        this.scheduleClean(sent);
        return sent;
    }
    async v2(options) {
        return this.v2Container(options);
    }
    async raw(options) {
        const sent = await this.sendableChannel.send({
            ...options,
            allowedMentions: options.allowedMentions ?? SAFE_ALLOWED_MENTIONS,
        });
        this.scheduleClean(sent);
        return sent;
    }
    async reply(text) {
        const sent = await this.message.reply({
            content: this.cleanSanitize(text),
            allowedMentions: SAFE_ALLOWED_MENTIONS,
        });
        this.scheduleClean(sent);
        return sent;
    }
    get sendableChannel() {
        return this.message.channel;
    }
}
//# sourceMappingURL=ResponseBuilder.js.map
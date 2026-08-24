import type { Message, MessageCreateOptions } from 'discord.js';
import type { StandardLayoutOptions } from '../ui/layouts.js';
export declare class ResponseBuilder {
    private readonly message;
    private autoCleanEnabled;
    private autoCleanDelayMs;
    private lastOutcome;
    private lastSnippet;
    constructor(message: Message);
    getLastOutcome(): 'success' | 'warning' | 'error' | 'info' | null;
    getLastSnippet(): string | null;
    enableAutoClean(delayMs?: number): this;
    private scheduleClean;
    private cleanSanitize;
    success(text: string): Promise<Message>;
    transientSuccess(text: string, delayMs?: number): Promise<Message>;
    transientWarning(text: string, delayMs?: number): Promise<Message>;
    transientInfo(text: string, delayMs?: number): Promise<Message>;
    error(text: string): Promise<Message>;
    warning(text: string): Promise<Message>;
    info(text: string): Promise<Message>;
    denied(text?: string): Promise<Message | null>;
    send(text: string): Promise<Message>;
    v2Container(options: StandardLayoutOptions): Promise<Message>;
    v2(options: StandardLayoutOptions): Promise<Message>;
    raw(options: MessageCreateOptions): Promise<Message>;
    reply(text: string): Promise<Message>;
    private get sendableChannel();
}
//# sourceMappingURL=ResponseBuilder.d.ts.map
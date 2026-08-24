import type { LogSeverity, LogCategory, CommandLogEvent } from '../../types/logging.js';
export declare function startWebhookLogger(): void;
export declare function stopWebhookLogger(): Promise<void>;
export declare function logEvent(severity: LogSeverity, category: LogCategory, message: string, details?: Record<string, unknown>): void;
export declare function logCommand(event: CommandLogEvent): void;
export declare function logInteraction(data: {
    type: string;
    customId: string;
    userTag: string;
    userId: string;
    guildName?: string;
    channelName?: string;
    details?: string;
}): void;
//# sourceMappingURL=WebhookLogger.d.ts.map
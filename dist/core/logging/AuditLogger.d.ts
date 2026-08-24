import type { Guild, GuildMember, User, Client } from 'discord.js';
import type { CommandLogEvent } from '../../types/logging.js';
export interface AuditLogOptions {
    guild: Guild;
    action: string;
    executor: GuildMember | User | string;
    target?: string;
    channelName?: string;
    details?: string | string[];
}
export declare function logAuditAction(options: AuditLogOptions): Promise<void>;
export declare function logCommandAudit(client: Client, event: CommandLogEvent): Promise<void>;
export declare function logInteractionAudit(client: Client, data: {
    guildId?: string;
    channelId?: string;
    channelName?: string;
    userId: string;
    userTag: string;
    type: string;
    customId: string;
    details?: string;
}): Promise<void>;
//# sourceMappingURL=AuditLogger.d.ts.map
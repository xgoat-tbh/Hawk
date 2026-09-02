import type { ConfessionRecord } from '../../../types/confession.js';
export declare function setConfessionChannel(guildId: string, channelId: string): Promise<void>;
export declare function getConfessionChannel(guildId: string): Promise<string | null>;
export declare function setConfessionLogChannel(guildId: string, logChannelId: string | null): Promise<void>;
export declare function getConfessionLogChannel(guildId: string): Promise<string | null>;
export declare function setConfessionPanelMessageId(guildId: string, messageId: string | null): Promise<void>;
export declare function getConfessionConfig(guildId: string): Promise<{
    channelId: string;
    panelMessageId: string | null;
    logChannelId: string | null;
} | null>;
export declare function getAllConfessionConfigs(): Promise<{
    guildId: string;
    channelId: string;
    panelMessageId: string | null;
    logChannelId: string | null;
}[]>;
export declare function createConfessionRecord(guildId: string, authorId: string, content: string, channelId: string, messageId: string): Promise<ConfessionRecord>;
export declare function getConfessionRecordsForGuild(guildId: string): Promise<ConfessionRecord[]>;
export declare function updateConfessionMessageId(id: number, messageId: string): Promise<void>;
export declare function resetConfessionDataForGuild(guildId: string): Promise<void>;
//# sourceMappingURL=confessionRepo.d.ts.map
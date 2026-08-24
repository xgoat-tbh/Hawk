import type { Message, PartialMessage } from 'discord.js';
export interface SnipeData {
    id?: string;
    content: string;
    authorTag: string;
    authorId: string;
    authorAvatar?: string;
    channelId: string;
    attachments: string[];
    deletedAt: Date;
}
export interface EditSnipeData {
    oldContent: string;
    newContent: string;
    authorTag: string;
    authorId: string;
    authorAvatar?: string;
    channelId: string;
    attachments: string[];
    editedAt: Date;
}
export declare function recordDeletedMessage(message: Message | PartialMessage): void;
export declare function recordEditedMessage(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): void;
export declare function getSnipes(channelId: string): SnipeData[];
export declare function getSnipe(channelId: string, index?: number): SnipeData | null;
export declare function getEditSnipes(channelId: string): EditSnipeData[];
export declare function getEditSnipe(channelId: string, index?: number): EditSnipeData | null;
export declare function clearChannelSnipe(channelId: string): boolean;
export declare function clearSnipeCache(): void;
//# sourceMappingURL=SnipeManager.d.ts.map
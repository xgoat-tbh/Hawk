import type { Message } from 'discord.js';
export declare enum MessageType {
    Normal = "normal",
    PrefixCommand = "prefix_command"
}
export declare function classifyMessage(message: Message, prefix: string): MessageType;
//# sourceMappingURL=MentionHandler.d.ts.map
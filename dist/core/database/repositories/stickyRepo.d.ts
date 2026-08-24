import type { StickyRecord, SetStickyInput } from '../../../types/sticky.js';
export declare function setSticky(input: SetStickyInput): Promise<StickyRecord>;
export declare function getSticky(guildId: string, channelId: string): Promise<StickyRecord | null>;
export declare function updateStickyMessageId(guildId: string, channelId: string, messageId: string): Promise<void>;
export declare function getStickiesForGuild(guildId: string): Promise<StickyRecord[]>;
export declare function deleteSticky(guildId: string, channelId: string): Promise<boolean>;
//# sourceMappingURL=stickyRepo.d.ts.map
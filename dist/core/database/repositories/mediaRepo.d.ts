import type { MediaChannelRecord } from '../../../types/media.js';
export declare function addMediaChannel(guildId: string, channelId: string): Promise<boolean>;
export declare function removeMediaChannel(guildId: string, channelId: string): Promise<boolean>;
export declare function getMediaChannels(guildId: string): Promise<MediaChannelRecord[]>;
export declare function isMediaChannel(guildId: string, channelId: string): Promise<boolean>;
export declare function setMediaAutoThread(guildId: string, enabled: boolean): Promise<void>;
export declare function getMediaAutoThread(guildId: string): Promise<boolean>;
//# sourceMappingURL=mediaRepo.d.ts.map
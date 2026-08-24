import type { GuildConfig } from '../../../types/config.js';
export declare function getPrefix(guildId: string): Promise<string>;
export declare function setPrefix(guildId: string, prefix: string): Promise<void>;
export declare function getLogChannel(guildId: string): Promise<string | null>;
export declare function setLogChannel(guildId: string, channelId: string | null): Promise<void>;
export declare function getGuildConfig(guildId: string): Promise<GuildConfig | null>;
export declare function ensureGuildConfig(guildId: string): Promise<void>;
export declare function invalidatePrefixCache(guildId: string): void;
export declare function invalidateLogChannelCache(guildId: string): void;
//# sourceMappingURL=guildConfigRepo.d.ts.map
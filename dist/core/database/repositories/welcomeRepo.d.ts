import type { WelcomeConfig } from '../../../types/welcome.js';
export declare function getWelcomeConfig(guildId: string): Promise<WelcomeConfig | null>;
export declare function setGreetChannel(guildId: string, channelId: string): Promise<void>;
export declare function setGreetPayload(guildId: string, payload: string): Promise<void>;
export declare function removeGreetPayload(guildId: string): Promise<void>;
export declare function setLeaveChannel(guildId: string, channelId: string): Promise<void>;
export declare function setLeavePayload(guildId: string, payload: string): Promise<void>;
export declare function removeLeavePayload(guildId: string): Promise<void>;
//# sourceMappingURL=welcomeRepo.d.ts.map
import type { GamePingConfig, CreateGamePingInput, UpdateGamePingInput } from '../../../types/gaming.js';
export declare function createGamePing(input: CreateGamePingInput): Promise<GamePingConfig>;
export declare function getGamePing(guildId: string, identifier: string): Promise<GamePingConfig | null>;
export declare function updateGamePing(guildId: string, identifier: string, updates: UpdateGamePingInput): Promise<GamePingConfig | null>;
export declare function deleteGamePing(guildId: string, identifier: string): Promise<boolean>;
export declare function listGamePings(guildId: string): Promise<GamePingConfig[]>;
export declare const getGame: typeof getGamePing;
export declare const deleteGame: typeof deleteGamePing;
export declare function setGameTestChannel(guildId: string, channelId: string | null): Promise<void>;
export declare function getGameTestChannel(guildId: string): Promise<string | null>;
//# sourceMappingURL=gameRepo.d.ts.map
import { type GuildMember } from 'discord.js';
import { type ComponentV2Payload } from '../../core/ui/index.js';
import type { Balance, LeaderboardEntry } from './economyService.js';
export declare function buildBalancePayload(member: GuildMember, balance: Balance, currencySymbol: string): ComponentV2Payload;
export declare function buildLeaderboardPayload(entries: LeaderboardEntry[], page: number, totalPages: number, sortBy: string, currencySymbol: string, guildName: string, invokerId: string): ComponentV2Payload;
export declare const buildBalanceEmbed: typeof buildBalancePayload;
export declare const buildLeaderboardEmbed: typeof buildLeaderboardPayload;
//# sourceMappingURL=economyUI.d.ts.map
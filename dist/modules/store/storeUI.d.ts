import { type ComponentV2Payload } from '../../core/ui/index.js';
import type { StoreItem, InventoryEntry } from './storeService.js';
export declare function buildStorePayload(items: StoreItem[], currencySymbol: string, guildName: string, page: number, totalPages: number, invokerId: string): ComponentV2Payload;
export declare function buildItemInfoPayload(item: StoreItem, currencySymbol: string): ComponentV2Payload;
export declare function buildInventoryPayload(entries: InventoryEntry[], userName: string, avatarUrl: string | undefined, currencySymbol: string): ComponentV2Payload;
export declare const buildInventoryEmbed: typeof buildInventoryPayload;
export declare const buildStoreEmbed: typeof buildStorePayload;
export declare const buildItemInfoEmbed: typeof buildItemInfoPayload;
//# sourceMappingURL=storeUI.d.ts.map
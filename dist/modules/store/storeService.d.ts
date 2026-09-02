import type { GuildMember } from 'discord.js';
export interface StoreItem {
    itemId: number;
    guildId: string;
    name: string;
    price: number;
    description: string;
    inventoryRoleId: string | null;
}
export interface InventoryEntry {
    inventoryId: number;
    itemId: number;
    name: string;
    quantity: number;
    price: number;
}
export declare function createItem(guildId: string, name: string, price: number, description: string, inventoryRoleId: string | null): Promise<StoreItem>;
export declare function deleteItem(guildId: string, itemId: number): Promise<boolean>;
export declare function getItems(guildId: string): Promise<StoreItem[]>;
export declare function getItem(guildId: string, nameOrId: string): Promise<StoreItem | null>;
export declare function buyItem(guildId: string, userId: string, itemId: number, quantity: number): Promise<void>;
export declare function sellItem(guildId: string, userId: string, itemId: number, quantity: number): Promise<{
    refund: number;
}>;
export declare function useItem(guildId: string, userId: string, itemId: number, member: GuildMember): Promise<{
    used: boolean;
    roleGranted: boolean;
}>;
export declare function giveItem(guildId: string, fromUserId: string, toUserId: string, itemId: number, quantity: number): Promise<void>;
export declare function getInventory(guildId: string, userId: string): Promise<InventoryEntry[]>;
export declare function spawnItem(guildId: string, userId: string, itemId: number, quantity: number): Promise<void>;
export declare function takeItem(guildId: string, userId: string, itemId: number, quantity: number): Promise<boolean>;
//# sourceMappingURL=storeService.d.ts.map
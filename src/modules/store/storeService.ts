import { getDb } from '../../core/database/pool.js';
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

export async function createItem(guildId: string, name: string, price: number, description: string, inventoryRoleId: string | null): Promise<StoreItem> {
  const db = getDb();
  const [item] = await db<StoreItem[]>`
    INSERT INTO store_items (guild_id, name, price, description, inventory_role_id)
    VALUES (${guildId}, ${name}, ${price}, ${description}, ${inventoryRoleId})
    RETURNING item_id AS "itemId", guild_id AS "guildId", name, price, description, inventory_role_id AS "inventoryRoleId"
  `;
  return item;
}

export async function deleteItem(guildId: string, itemId: number): Promise<boolean> {
  const db = getDb();
  const result = await db`
    DELETE FROM store_items
    WHERE guild_id = ${guildId} AND item_id = ${itemId}
  `;
  return result.count > 0;
}

export async function getItems(guildId: string): Promise<StoreItem[]> {
  const db = getDb();
  return db<StoreItem[]>`
    SELECT item_id AS "itemId", guild_id AS "guildId", name, price, description, inventory_role_id AS "inventoryRoleId"
    FROM store_items
    WHERE guild_id = ${guildId}
    ORDER BY price ASC
  `;
}

export async function getItem(guildId: string, nameOrId: string): Promise<StoreItem | null> {
  const db = getDb();
  let item: StoreItem[];
  const idMatch = Number(nameOrId);
  if (!isNaN(idMatch) && idMatch > 0) {
    item = await db<StoreItem[]>`
      SELECT item_id AS "itemId", guild_id AS "guildId", name, price, description, inventory_role_id AS "inventoryRoleId"
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${idMatch}
    `;
  } else {
    item = await db<StoreItem[]>`
      SELECT item_id AS "itemId", guild_id AS "guildId", name, price, description, inventory_role_id AS "inventoryRoleId"
      FROM store_items
      WHERE guild_id = ${guildId} AND LOWER(name) = LOWER(${nameOrId})
    `;
  }
  return item.length > 0 ? item[0] : null;
}

export async function buyItem(guildId: string, userId: string, itemId: number, quantity: number): Promise<void> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');
  
  const db = getDb();
  
  await db.begin(async (sql) => {
    const [item] = await sql<StoreItem[]>`
      SELECT item_id AS "itemId", guild_id AS "guildId", name, price, description, inventory_role_id AS "inventoryRoleId"
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (!item) throw new Error('Item not found.');
    
    const cost = item.price * quantity;
    const [balance] = await sql`
      SELECT cash FROM users WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;
    if (!balance || balance.cash < cost) throw new Error('Insufficient funds.');

    await sql`
      UPDATE users SET cash = cash - ${cost} WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;

    const [inv] = await sql`
      SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}
    `;
    if (inv) {
      await sql`
        UPDATE user_inventory SET quantity = quantity + ${quantity} WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}
      `;
    } else {
      await sql`
        INSERT INTO user_inventory (guild_id, user_id, item_id, quantity)
        VALUES (${guildId}, ${userId}, ${itemId}, ${quantity})
      `;
    }
  });
}

export async function sellItem(guildId: string, userId: string, itemId: number, quantity: number): Promise<{ refund: number }> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');
  
  const db = getDb();
  
  return db.begin(async (sql) => {
    const [item] = await sql<StoreItem[]>`
      SELECT item_id AS "itemId", guild_id AS "guildId", name, price, description, inventory_role_id AS "inventoryRoleId"
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (!item) throw new Error('Item not found.');

    const [inv] = await sql`
      SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}
    `;
    if (!inv || inv.quantity < quantity) throw new Error('Insufficient item quantity in inventory.');

    const newQuantity = inv.quantity - quantity;
    if (newQuantity > 0) {
      await sql`UPDATE user_inventory SET quantity = ${newQuantity} WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}`;
    } else {
      await sql`DELETE FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}`;
    }

    const refund = Math.floor((item.price * quantity) / 2);
    
    await sql`
      UPDATE users SET cash = cash + ${refund} WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;

    return { refund };
  });
}

export async function useItem(guildId: string, userId: string, itemId: number, member: GuildMember): Promise<{ used: boolean, roleGranted: boolean }> {
  const db = getDb();
  return db.begin(async (sql) => {
    const [item] = await sql<StoreItem[]>`
      SELECT item_id AS "itemId", guild_id AS "guildId", name, price, description, inventory_role_id AS "inventoryRoleId"
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (!item) throw new Error('Item not found.');

    const [inv] = await sql`
      SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}
    `;
    if (!inv || inv.quantity < 1) throw new Error('You do not own this item.');

    const newQuantity = inv.quantity - 1;
    if (newQuantity > 0) {
      await sql`UPDATE user_inventory SET quantity = ${newQuantity} WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}`;
    } else {
      await sql`DELETE FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}`;
    }

    let roleGranted = false;
    if (item.inventoryRoleId) {
      try {
        await member.roles.add(item.inventoryRoleId);
        roleGranted = true;
      } catch (err) {
        console.error('Failed to grant role', err);
      }
    }

    return { used: true, roleGranted };
  });
}

export async function giveItem(guildId: string, fromUserId: string, toUserId: string, itemId: number, quantity: number): Promise<void> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');
  
  const db = getDb();
  
  await db.begin(async (sql) => {
    const [item] = await sql<StoreItem[]>`
      SELECT item_id AS "itemId"
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (!item) throw new Error('Item not found.');

    const [inv] = await sql`
      SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${fromUserId} AND item_id = ${itemId}
    `;
    if (!inv || inv.quantity < quantity) throw new Error('Insufficient item quantity in inventory.');

    const newQuantity = inv.quantity - quantity;
    if (newQuantity > 0) {
      await sql`UPDATE user_inventory SET quantity = ${newQuantity} WHERE guild_id = ${guildId} AND user_id = ${fromUserId} AND item_id = ${itemId}`;
    } else {
      await sql`DELETE FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${fromUserId} AND item_id = ${itemId}`;
    }

    const [receiverInv] = await sql`
      SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${toUserId} AND item_id = ${itemId}
    `;
    if (receiverInv) {
      await sql`
        UPDATE user_inventory SET quantity = quantity + ${quantity} WHERE guild_id = ${guildId} AND user_id = ${toUserId} AND item_id = ${itemId}
      `;
    } else {
      await sql`
        INSERT INTO user_inventory (guild_id, user_id, item_id, quantity)
        VALUES (${guildId}, ${toUserId}, ${itemId}, ${quantity})
      `;
    }
  });
}

export async function getInventory(guildId: string, userId: string): Promise<InventoryEntry[]> {
  const db = getDb();
  return db<InventoryEntry[]>`
    SELECT ui.inventory_id AS "inventoryId", ui.item_id AS "itemId", ui.quantity, si.name, si.price
    FROM user_inventory ui
    JOIN store_items si ON ui.item_id = si.item_id
    WHERE ui.guild_id = ${guildId} AND ui.user_id = ${userId}
    ORDER BY si.name ASC
  `;
}

export async function spawnItem(guildId: string, userId: string, itemId: number, quantity: number): Promise<void> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');
  
  const db = getDb();
  await db.begin(async (sql) => {
    const [inv] = await sql`
      SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}
    `;
    if (inv) {
      await sql`
        UPDATE user_inventory SET quantity = quantity + ${quantity} WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}
      `;
    } else {
      await sql`
        INSERT INTO user_inventory (guild_id, user_id, item_id, quantity)
        VALUES (${guildId}, ${userId}, ${itemId}, ${quantity})
      `;
    }
  });
}

export async function takeItem(guildId: string, userId: string, itemId: number, quantity: number): Promise<boolean> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');
  
  const db = getDb();
  return db.begin(async (sql) => {
    const [inv] = await sql`
      SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}
    `;
    if (!inv || inv.quantity < quantity) return false;

    const newQuantity = inv.quantity - quantity;
    if (newQuantity > 0) {
      await sql`UPDATE user_inventory SET quantity = ${newQuantity} WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}`;
    } else {
      await sql`DELETE FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}`;
    }
    return true;
  });
}


import { getDb } from '../../core/database/pool.js';
import type { GuildMember } from 'discord.js';
import { logTransaction } from '../../core/database/repositories/transactionRepo.js';

export interface StoreItem {
  itemId: number;
  guildId: string;
  name: string;
  price: number;
  description: string;
  inventoryRoleId: string | null;
  inventoryEnabled: boolean;
  usable: boolean;
  sellable: boolean;
  stock: number; // -1 for unlimited
  roleRequired: string | null;
  roleGiven: string | null;
  roleRemoved: string | null;
  replyMessage: string | null;
  requirementsJson: any[];
  actionsJson: any[];
  iconUrl: string | null;
  createdAt: Date;
}

export interface InventoryEntry {
  inventoryId: number;
  itemId: number;
  name: string;
  quantity: number;
  price: number;
  description?: string;
  iconUrl?: string | null;
  usable?: boolean;
  sellable?: boolean;
}

function mapItemRow(r: any): StoreItem {
  return {
    itemId: r.item_id,
    guildId: r.guild_id,
    name: r.name,
    price: Number(r.price),
    description: r.description || '',
    inventoryRoleId: r.inventory_role_id || null,
    inventoryEnabled: r.inventory_enabled ?? true,
    usable: r.usable ?? true,
    sellable: r.sellable ?? true,
    stock: r.stock !== undefined ? Number(r.stock) : -1,
    roleRequired: r.role_required || null,
    roleGiven: r.role_given || null,
    roleRemoved: r.role_removed || null,
    replyMessage: r.reply_message || null,
    requirementsJson: Array.isArray(r.requirements_json) ? r.requirements_json : [],
    actionsJson: Array.isArray(r.actions_json) ? r.actions_json : [],
    iconUrl: r.icon_url || null,
    createdAt: new Date(r.created_at || Date.now()),
  };
}

export async function createItem(
  guildId: string,
  name: string,
  price: number,
  description: string = '',
  inventoryRoleId: string | null = null,
  options: Partial<StoreItem> = {},
): Promise<StoreItem> {
  const db = getDb();
  const rows = await db`
    INSERT INTO store_items (
      guild_id, name, price, description, inventory_role_id,
      inventory_enabled, usable, sellable, stock,
      role_required, role_given, role_removed, reply_message,
      requirements_json, actions_json, icon_url
    )
    VALUES (
      ${guildId}, ${name}, ${price}, ${description}, ${inventoryRoleId},
      ${options.inventoryEnabled ?? true},
      ${options.usable ?? true},
      ${options.sellable ?? true},
      ${options.stock ?? -1},
      ${options.roleRequired ?? null},
      ${options.roleGiven ?? null},
      ${options.roleRemoved ?? null},
      ${options.replyMessage ?? null},
      ${JSON.stringify(options.requirementsJson || [])},
      ${JSON.stringify(options.actionsJson || [])},
      ${options.iconUrl ?? null}
    )
    RETURNING *
  `;
  return mapItemRow(rows[0]);
}

export async function editItem(
  guildId: string,
  itemId: number,
  updates: Partial<StoreItem>,
): Promise<StoreItem | null> {
  const db = getDb();
  const existing = await getItem(guildId, String(itemId));
  if (!existing) return null;

  const name = updates.name ?? existing.name;
  const price = updates.price ?? existing.price;
  const description = updates.description ?? existing.description;
  const inventoryRoleId = updates.inventoryRoleId !== undefined ? updates.inventoryRoleId : existing.inventoryRoleId;
  const inventoryEnabled = updates.inventoryEnabled ?? existing.inventoryEnabled;
  const usable = updates.usable ?? existing.usable;
  const sellable = updates.sellable ?? existing.sellable;
  const stock = updates.stock ?? existing.stock;
  const roleRequired = updates.roleRequired !== undefined ? updates.roleRequired : existing.roleRequired;
  const roleGiven = updates.roleGiven !== undefined ? updates.roleGiven : existing.roleGiven;
  const roleRemoved = updates.roleRemoved !== undefined ? updates.roleRemoved : existing.roleRemoved;
  const replyMessage = updates.replyMessage !== undefined ? updates.replyMessage : existing.replyMessage;
  const requirementsJson = updates.requirementsJson ?? existing.requirementsJson;
  const actionsJson = updates.actionsJson ?? existing.actionsJson;
  const iconUrl = updates.iconUrl !== undefined ? updates.iconUrl : existing.iconUrl;

  const rows = await db`
    UPDATE store_items
    SET
      name = ${name},
      price = ${price},
      description = ${description},
      inventory_role_id = ${inventoryRoleId},
      inventory_enabled = ${inventoryEnabled},
      usable = ${usable},
      sellable = ${sellable},
      stock = ${stock},
      role_required = ${roleRequired},
      role_given = ${roleGiven},
      role_removed = ${roleRemoved},
      reply_message = ${replyMessage},
      requirements_json = ${JSON.stringify(requirementsJson)},
      actions_json = ${JSON.stringify(actionsJson)},
      icon_url = ${iconUrl}
    WHERE guild_id = ${guildId} AND item_id = ${itemId}
    RETURNING *
  `;

  return rows.length > 0 ? mapItemRow(rows[0]) : null;
}

export const updateItem = editItem;

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
  const rows = await db`
    SELECT *
    FROM store_items
    WHERE guild_id = ${guildId}
    ORDER BY price ASC
  `;
  return rows.map(mapItemRow);
}

export async function getItem(guildId: string, nameOrId: string): Promise<StoreItem | null> {
  const db = getDb();
  let rows: any[];
  const idMatch = Number(nameOrId);
  if (!isNaN(idMatch) && idMatch > 0) {
    rows = await db`
      SELECT *
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${idMatch}
    `;
  } else {
    rows = await db`
      SELECT *
      FROM store_items
      WHERE guild_id = ${guildId} AND LOWER(name) = LOWER(${nameOrId})
    `;
  }
  return rows.length > 0 ? mapItemRow(rows[0]) : null;
}

export async function buyItem(
  guildId: string,
  userId: string,
  itemId: number,
  quantity: number = 1,
  member?: GuildMember,
): Promise<{ item: StoreItem; totalCost: number }> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');

  const db = getDb();

  return db.begin(async (sql) => {
    const rows = await sql`
      SELECT *
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${itemId}
      FOR UPDATE
    `;
    if (rows.length === 0) throw new Error('Item not found.');
    const item = mapItemRow(rows[0]);

    if (item.roleRequired && member) {
      const hasReqRole = member.roles.cache.has(item.roleRequired);
      if (!hasReqRole) {
        throw new Error(`You need the <@&${item.roleRequired}> role to purchase this item.`);
      }
    }

    if (item.stock !== -1) {
      if (item.stock < quantity) {
        throw new Error(`Only ${item.stock} item(s) left in stock.`);
      }
      await sql`
        UPDATE store_items
        SET stock = stock - ${quantity}
        WHERE guild_id = ${guildId} AND item_id = ${itemId}
      `;
    }

    const totalCost = item.price * quantity;
    const [balance] = await sql`
      SELECT cash FROM economy_balances WHERE guild_id = ${guildId} AND user_id = ${userId} FOR UPDATE
    `;
    if (!balance || Number(balance.cash) < totalCost) throw new Error('Insufficient cash in wallet.');

    await sql`
      UPDATE economy_balances
      SET cash = cash - ${totalCost}, updated_at = NOW()
      WHERE guild_id = ${guildId} AND user_id = ${userId}
    `;

    if (item.inventoryEnabled) {
      const [inv] = await sql`
        SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}
      `;
      if (inv) {
        await sql`
          UPDATE user_inventory SET quantity = quantity + ${quantity}
          WHERE guild_id = ${guildId} AND user_id = ${userId} AND item_id = ${itemId}
        `;
      } else {
        await sql`
          INSERT INTO user_inventory (guild_id, user_id, item_id, quantity)
          VALUES (${guildId}, ${userId}, ${itemId}, ${quantity})
        `;
      }
    }

    await logTransaction(
      guildId,
      userId,
      'buy',
      totalCost,
      'store',
      String(itemId),
      `Bought ${quantity}x ${item.name}`,
    ).catch(() => {});

    return { item, totalCost };
  });
}

export async function sellItem(
  guildId: string,
  userId: string,
  itemId: number,
  quantity: number = 1,
): Promise<{ refund: number; item: StoreItem }> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');

  const db = getDb();

  return db.begin(async (sql) => {
    const rows = await sql`
      SELECT *
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (rows.length === 0) throw new Error('Item not found.');
    const item = mapItemRow(rows[0]);

    if (!item.sellable) {
      throw new Error('This item cannot be sold.');
    }

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
      INSERT INTO economy_balances (guild_id, user_id, cash)
      VALUES (${guildId}, ${userId}, ${refund})
      ON CONFLICT (guild_id, user_id)
      DO UPDATE SET cash = economy_balances.cash + ${refund}, updated_at = NOW()
    `;

    await logTransaction(
      guildId,
      userId,
      'sell',
      refund,
      'inventory',
      String(itemId),
      `Sold ${quantity}x ${item.name} for refund`,
    ).catch(() => {});

    return { refund, item };
  });
}

export async function useItem(
  guildId: string,
  userId: string,
  itemId: number,
  member: GuildMember,
): Promise<{ used: boolean; replyMessage: string | null; roleGivenSuccess: boolean; roleRemovedSuccess: boolean }> {
  const db = getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      SELECT *
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (rows.length === 0) throw new Error('Item not found.');
    const item = mapItemRow(rows[0]);

    if (!item.usable) {
      throw new Error('This item cannot be used.');
    }

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

    let roleGivenSuccess = false;
    let roleRemovedSuccess = false;

    // Check legacy inventoryRoleId or new roleGiven
    const targetAddRole = item.roleGiven || item.inventoryRoleId;
    if (targetAddRole) {
      try {
        await member.roles.add(targetAddRole);
        roleGivenSuccess = true;
      } catch (err) {
        console.error('Failed to grant role:', err);
      }
    }

    if (item.roleRemoved) {
      try {
        await member.roles.remove(item.roleRemoved);
        roleRemovedSuccess = true;
      } catch (err) {
        console.error('Failed to remove role:', err);
      }
    }

    await logTransaction(
      guildId,
      userId,
      'use',
      0,
      'inventory',
      String(itemId),
      `Used ${item.name}`,
    ).catch(() => {});

    return {
      used: true,
      replyMessage: item.replyMessage,
      roleGivenSuccess,
      roleRemovedSuccess,
    };
  });
}

export async function giveItem(
  guildId: string,
  fromUserId: string,
  toUserId: string,
  itemId: number,
  quantity: number = 1,
): Promise<StoreItem> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');

  const db = getDb();

  return db.begin(async (sql) => {
    const rows = await sql`
      SELECT *
      FROM store_items
      WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (rows.length === 0) throw new Error('Item not found.');
    const item = mapItemRow(rows[0]);

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

    await logTransaction(
      guildId,
      fromUserId,
      'transfer',
      quantity,
      'inventory',
      toUserId,
      `Sent ${quantity}x ${item.name} to <@${toUserId}>`,
    ).catch(() => {});

    return item;
  });
}

export async function adminGrantItem(
  guildId: string,
  targetUserId: string,
  itemId: number,
  quantity: number = 1,
  adminId: string,
): Promise<StoreItem> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');

  const db = getDb();

  return db.begin(async (sql) => {
    const rows = await sql`
      SELECT * FROM store_items WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (rows.length === 0) throw new Error('Item not found.');
    const item = mapItemRow(rows[0]);

    const [receiverInv] = await sql`
      SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${targetUserId} AND item_id = ${itemId}
    `;
    if (receiverInv) {
      await sql`
        UPDATE user_inventory SET quantity = quantity + ${quantity} WHERE guild_id = ${guildId} AND user_id = ${targetUserId} AND item_id = ${itemId}
      `;
    } else {
      await sql`
        INSERT INTO user_inventory (guild_id, user_id, item_id, quantity)
        VALUES (${guildId}, ${targetUserId}, ${itemId}, ${quantity})
      `;
    }

    await logTransaction(
      guildId,
      targetUserId,
      'admin_grant',
      quantity,
      'inventory',
      adminId,
      `Admin <@${adminId}> granted ${quantity}x ${item.name}`,
    ).catch(() => {});

    return item;
  });
}

export async function adminTakeItem(
  guildId: string,
  targetUserId: string,
  itemId: number,
  quantity: number = 1,
  adminId: string,
): Promise<{ item: StoreItem; removed: number }> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');

  const db = getDb();

  return db.begin(async (sql) => {
    const rows = await sql`
      SELECT * FROM store_items WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (rows.length === 0) throw new Error('Item not found.');
    const item = mapItemRow(rows[0]);

    const [inv] = await sql`
      SELECT quantity FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${targetUserId} AND item_id = ${itemId}
    `;
    if (!inv || inv.quantity <= 0) throw new Error('User has none of this item in their inventory.');

    const toRemove = Math.min(inv.quantity, quantity);
    const newQty = inv.quantity - toRemove;

    if (newQty > 0) {
      await sql`
        UPDATE user_inventory SET quantity = ${newQty} WHERE guild_id = ${guildId} AND user_id = ${targetUserId} AND item_id = ${itemId}
      `;
    } else {
      await sql`
        DELETE FROM user_inventory WHERE guild_id = ${guildId} AND user_id = ${targetUserId} AND item_id = ${itemId}
      `;
    }

    await logTransaction(
      guildId,
      targetUserId,
      'admin_take',
      -toRemove,
      'inventory',
      adminId,
      `Admin <@${adminId}> took ${toRemove}x ${item.name}`,
    ).catch(() => {});

    return { item, removed: toRemove };
  });
}

export async function getInventory(guildId: string, userId: string): Promise<InventoryEntry[]> {
  const db = getDb();
  const rows = await db`
    SELECT
      ui.inventory_id,
      ui.item_id,
      ui.quantity,
      si.name,
      si.price,
      si.description,
      si.icon_url,
      si.usable,
      si.sellable
    FROM user_inventory ui
    JOIN store_items si ON ui.item_id = si.item_id
    WHERE ui.guild_id = ${guildId} AND ui.user_id = ${userId}
    ORDER BY si.name ASC
  `;

  return rows.map((r: any) => ({
    inventoryId: r.inventory_id,
    itemId: r.item_id,
    name: r.name,
    price: Number(r.price),
    quantity: Number(r.quantity),
    description: r.description || '',
    iconUrl: r.icon_url || null,
    usable: r.usable ?? true,
    sellable: r.sellable ?? true,
  }));
}

export async function spawnItem(
  guildId: string,
  userId: string,
  itemId: number,
  quantity: number = 1,
): Promise<StoreItem> {
  if (quantity <= 0) throw new Error('Quantity must be greater than 0.');

  const db = getDb();
  return db.begin(async (sql) => {
    const rows = await sql`
      SELECT * FROM store_items WHERE guild_id = ${guildId} AND item_id = ${itemId}
    `;
    if (rows.length === 0) throw new Error('Item not found.');
    const item = mapItemRow(rows[0]);

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

    return item;
  });
}

export async function takeItem(
  guildId: string,
  userId: string,
  itemId: number,
  quantity: number = 1,
): Promise<boolean> {
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

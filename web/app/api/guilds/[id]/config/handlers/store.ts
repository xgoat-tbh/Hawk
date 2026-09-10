import { db } from '@/lib/db';
import { cleanSnowflake, cleanString, cleanInt, HandlerResult } from '../helpers';

export async function handleStore(guildId: string, module: string, data: any): Promise<HandlerResult> {
  if (module === 'add_store_item') {
    const name = cleanString(data.name, 100);
    const price = cleanInt(data.price, 1, 1_000_000_000, 100);
    const description = cleanString(data.description, 255) || null;
    const inventory_role_id = cleanSnowflake(data.inventory_role_id);

    if (!name) {
      return { success: false, error: 'Item name is required.', status: 400 };
    }

    const [last] = await db`SELECT COALESCE(MAX(item_id), 0) + 1 AS next_id FROM store_items WHERE guild_id = ${guildId}`;
    const nextId = last.next_id;

    await db`
      INSERT INTO store_items (guild_id, item_id, name, price, description, inventory_role_id)
      VALUES (${guildId}, ${nextId}, ${name}, ${price}, ${description}, ${inventory_role_id})
    `;

    return { success: true, data: { item_id: nextId, name, price, description, inventory_role_id } };
  }

  if (module === 'delete_store_item') {
    const item_id = cleanInt(data.item_id);
    await db`DELETE FROM store_items WHERE guild_id = ${guildId} AND item_id = ${item_id}`;
    return { success: true, data: { item_id, deleted: true } };
  }

  return { success: false, error: `Unsupported store action: ${module}`, status: 400 };
}

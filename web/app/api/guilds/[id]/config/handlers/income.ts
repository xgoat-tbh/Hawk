import { db } from '@/lib/db';
import { cleanSnowflake, cleanInt, HandlerResult } from '../helpers';

export async function handleIncome(guildId: string, module: string, data: any): Promise<HandlerResult> {
  if (module === 'income_add_role') {
    const role_id = cleanSnowflake(data.role_id);
    const income_amount = cleanInt(data.income_amount, 1, 1_000_000_000, 100);
    if (!role_id) {
      return { success: false, error: 'Role is required.', status: 400 };
    }

    await db`
      INSERT INTO income_roles (guild_id, role_id, income_amount)
      VALUES (${guildId}, ${role_id}, ${income_amount})
      ON CONFLICT (guild_id, role_id)
      DO UPDATE SET income_amount = EXCLUDED.income_amount
    `;

    return { success: true, data: { role_id, income_amount } };
  }

  if (module === 'income_delete_role') {
    const role_id = cleanSnowflake(data.role_id);
    if (role_id) {
      await db`DELETE FROM income_roles WHERE guild_id = ${guildId} AND role_id = ${role_id}`;
    }
    return { success: true, data: { role_id, deleted: true } };
  }

  return { success: false, error: `Unsupported income action: ${module}`, status: 400 };
}

import { db } from '@/lib/db';
import { cleanSnowflake, cleanString, cleanInt, HandlerResult } from '../helpers';

export async function handlePermissions(guildId: string, module: string, data: any): Promise<HandlerResult> {
  if (module === 'permit_add') {
    const target_type = data.target_type === 'role' ? 'role' : 'user';
    const target_id = cleanSnowflake(data.target_id);
    const command_name = cleanString(data.command_name, 32).toLowerCase() || null;
    const module_name = cleanString(data.module_name, 32).toLowerCase() || null;

    if (!target_id) {
      return { success: false, error: 'Target ID is required.', status: 400 };
    }

    await db`
      INSERT INTO permits (guild_id, target_type, target_id, command_name, module_name)
      VALUES (${guildId}, ${target_type}, ${target_id}, ${command_name}, ${module_name})
      ON CONFLICT (guild_id, target_type, target_id, command_name, module_name) DO NOTHING
    `;
    return { success: true, data: { target_type, target_id, command_name, module_name } };
  }

  if (module === 'permit_delete') {
    const id = cleanInt(data.id);
    if (id) {
      await db`DELETE FROM permits WHERE guild_id = ${guildId} AND id = ${id}`;
    }
    return { success: true, data: { id, deleted: true } };
  }

  if (module === 'restrict_add') {
    const { target_type, target_id, location_type, location_id, effect } = data;
    const command_name = cleanString(data.command_name, 32).toLowerCase() || null;
    const module_name = cleanString(data.module_name, 32).toLowerCase();
    const cleanTargetId = cleanSnowflake(target_id);
    const cleanLocId = cleanSnowflake(location_id);
    const cleanEffect = effect === 'deny' ? 'deny' : 'allow';
    const cleanLocType = location_type === 'category' ? 'category' : 'channel';

    if (!cleanLocId) {
      return { success: false, error: 'Location ID is required.', status: 400 };
    }

    await db`
      INSERT INTO restrictions (guild_id, command_name, module_name, target_type, target_id, location_type, location_id, effect)
      VALUES (
        ${guildId},
        ${command_name},
        ${module_name || 'general'},
        ${target_type === 'user' ? 'user' : target_type === 'role' ? 'role' : null},
        ${cleanTargetId},
        ${cleanLocType},
        ${cleanLocId},
        ${cleanEffect}
      )
      ON CONFLICT (guild_id, command_name, module_name, target_type, target_id, location_type, location_id) DO NOTHING
    `;
    return {
      success: true,
      data: {
        command_name,
        module_name,
        target_type,
        target_id: cleanTargetId,
        location_type: cleanLocType,
        location_id: cleanLocId,
        effect: cleanEffect,
      },
    };
  }

  if (module === 'restrict_delete') {
    const id = cleanInt(data.id);
    if (id) {
      await db`DELETE FROM restrictions WHERE guild_id = ${guildId} AND id = ${id}`;
    }
    return { success: true, data: { id, deleted: true } };
  }

  if (module === 'ignore_add') {
    const { entity_type, entity_id, scope_type, scope_id } = data;
    const cleanEntityId = cleanSnowflake(entity_id);
    const cleanEntityType = ['user', 'role', 'channel', 'category'].includes(entity_type) ? entity_type : 'channel';

    if (!cleanEntityId) {
      return { success: false, error: 'Entity ID is required.', status: 400 };
    }

    await db`
      INSERT INTO ignored_entities (guild_id, entity_type, entity_id, scope_type, scope_id)
      VALUES (${guildId}, ${cleanEntityType}, ${cleanEntityId}, ${scope_type || null}, ${scope_id || null})
      ON CONFLICT (guild_id, entity_type, entity_id, scope_type, scope_id) DO NOTHING
    `;
    return { success: true, data: { entity_type: cleanEntityType, entity_id: cleanEntityId, scope_type, scope_id } };
  }

  if (module === 'ignore_delete') {
    const id = cleanInt(data.id);
    if (id) {
      await db`DELETE FROM ignored_entities WHERE guild_id = ${guildId} AND id = ${id}`;
    }
    return { success: true, data: { id, deleted: true } };
  }

  return { success: false, error: `Unsupported permissions action: ${module}`, status: 400 };
}

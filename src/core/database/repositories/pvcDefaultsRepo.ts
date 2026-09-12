import { getDb } from '../pool.js';

export interface PvcUserDefaults {
  guildId: string;
  userId: string;
  nameTemplate: string;
  userLimit: number;
  isLocked: boolean;
  isHidden: boolean;
  autoPayEnabled: boolean;
  updatedAt: Date;
}

export async function getUserPvcDefaults(
  guildId: string,
  userId: string,
): Promise<PvcUserDefaults | null> {
  const db = getDb();
  const rows = await db`
    SELECT guild_id, user_id, name_template, user_limit, is_locked, is_hidden, auto_pay_enabled, updated_at
    FROM pvc_user_defaults
    WHERE guild_id = ${guildId} AND user_id = ${userId}
  `;

  if (rows.length === 0) return null;

  const r = rows[0];
  return {
    guildId: r.guild_id,
    userId: r.user_id,
    nameTemplate: r.name_template,
    userLimit: r.user_limit,
    isLocked: r.is_locked,
    isHidden: r.is_hidden,
    autoPayEnabled: r.auto_pay_enabled,
    updatedAt: new Date(r.updated_at),
  };
}

export async function setUserPvcDefaults(
  defaults: Omit<PvcUserDefaults, 'updatedAt'>,
): Promise<PvcUserDefaults> {
  const db = getDb();
  const rows = await db`
    INSERT INTO pvc_user_defaults (
      guild_id, user_id, name_template, user_limit, is_locked, is_hidden, auto_pay_enabled, updated_at
    ) VALUES (
      ${defaults.guildId},
      ${defaults.userId},
      ${defaults.nameTemplate || "{username}'s Channel"},
      ${defaults.userLimit ?? 0},
      ${defaults.isLocked ?? false},
      ${defaults.isHidden ?? false},
      ${defaults.autoPayEnabled ?? false},
      NOW()
    )
    ON CONFLICT (guild_id, user_id)
    DO UPDATE SET
      name_template = EXCLUDED.name_template,
      user_limit = EXCLUDED.user_limit,
      is_locked = EXCLUDED.is_locked,
      is_hidden = EXCLUDED.is_hidden,
      auto_pay_enabled = EXCLUDED.auto_pay_enabled,
      updated_at = NOW()
    RETURNING guild_id, user_id, name_template, user_limit, is_locked, is_hidden, auto_pay_enabled, updated_at
  `;

  const r = rows[0];
  return {
    guildId: r.guild_id,
    userId: r.user_id,
    nameTemplate: r.name_template,
    userLimit: r.user_limit,
    isLocked: r.is_locked,
    isHidden: r.is_hidden,
    autoPayEnabled: r.auto_pay_enabled,
    updatedAt: new Date(r.updated_at),
  };
}

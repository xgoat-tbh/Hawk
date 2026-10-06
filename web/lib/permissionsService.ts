import { db, ensureDatabaseSchema } from '@/lib/db';
import { BOT_COMMAND_CATALOG } from '@/lib/commands';
import { fetchGuildMember, fetchDiscordUser } from '@/lib/discord';
import {
  DEFAULT_PRESET_PROFILES,
  PermissionProfile,
  RolePolicy,
  UserOverride,
  CommandAcl,
} from '@/lib/permissions';

export async function fetchGuildPermissions(guildId: string): Promise<{
  profiles: PermissionProfile[];
  rolePolicies: RolePolicy[];
  userOverrides: UserOverride[];
  commandAcls: CommandAcl[];
}> {
  await ensureDatabaseSchema();

  // 1. Fetch custom profiles from PostgreSQL
  let customProfiles: PermissionProfile[] = [];
  try {
    const profileRows = await db`SELECT * FROM custom_profiles WHERE guild_id = ${guildId} ORDER BY created_at ASC`;
    customProfiles = profileRows.map((r: any) => ({
      id: r.profile_id,
      name: r.name,
      description: r.description || '',
      isPreset: false,
      inheritsFrom: r.inherits_from || undefined,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
    }));
  } catch (err) {
    console.warn('custom_profiles query error:', err);
  }

  const profiles: PermissionProfile[] = [...DEFAULT_PRESET_PROFILES, ...customProfiles];

  // 2. Fetch role policies from PostgreSQL
  let rolePolicies: RolePolicy[] = [];
  try {
    const roleRows = await db`SELECT * FROM role_policies WHERE guild_id = ${guildId} ORDER BY created_at ASC`;
    rolePolicies = roleRows.map((r: any) => ({
      roleId: r.role_id,
      roleName: r.role_name,
      profileId: r.profile_id,
      memberCount: Number(r.member_count) || 0,
      status: (r.status as 'active' | 'inactive') || 'active',
    }));
  } catch (err) {
    console.warn('role_policies query error:', err);
  }

  // 3. Fetch user overrides from PostgreSQL
  let userOverrides: UserOverride[] = [];
  try {
    const overrideRows = await db`SELECT * FROM user_overrides WHERE guild_id = ${guildId} ORDER BY created_at ASC`;
    userOverrides = overrideRows.map((r: any) => ({
      userId: r.user_id,
      userName: r.user_name,
      module: r.module,
      action: r.action as 'view' | 'manage' | 'delete',
      effect: r.effect as 'ALLOW' | 'DENY',
    }));

    // Enrich all distinct userIds with avatarUrl
    const distinctUserIds = Array.from(new Set(userOverrides.map((uo) => uo.userId)));
    const avatarMap = new Map<string, string | null>();
    await Promise.all(
      distinctUserIds.map(async (uid) => {
        const member = await fetchGuildMember(guildId, uid);
        const user = member?.user || (await fetchDiscordUser(uid));
        const avatarHash = member?.user?.avatar || user?.avatar;
        if (avatarHash) {
          avatarMap.set(uid, `https://cdn.discordapp.com/avatars/${uid}/${avatarHash}.png?size=128`);
        }
      })
    );

    userOverrides = userOverrides.map((uo) => ({
      ...uo,
      avatarUrl: uo.avatarUrl || avatarMap.get(uo.userId) || null,
    }));
  } catch (err) {
    console.warn('user_overrides query error:', err);
  }

  // 4. Construct command ACLs synced with PostgreSQL 'permits' table
  const commandAcls: CommandAcl[] = BOT_COMMAND_CATALOG.map((cmd) => ({
    command: cmd.name,
    category: cmd.category,
    description: cmd.description,
    defaultRoleProfile: cmd.defaultRoleProfile,
    requiredDiscordPerm: cmd.requiredDiscordPerm,
    dangerLevel: cmd.dangerLevel,
    roleOverrides: [],
    userOverrides: [],
  }));

  try {
    const permits = await db`SELECT * FROM permits WHERE guild_id = ${guildId}`;
    permits.forEach((p: any) => {
      const cmdName = p.command_name;
      if (cmdName) {
        let cmd = commandAcls.find((c) => c.command.toLowerCase() === cmdName.toLowerCase());
        if (!cmd) {
          cmd = {
            command: cmdName,
            category: 'custom',
            description: `Custom command permit for !${cmdName}`,
            defaultRoleProfile: 'custom',
            dangerLevel: 'MEDIUM',
            roleOverrides: [],
            userOverrides: [],
          };
          commandAcls.push(cmd);
        }

        if (p.target_type === 'role') {
          if (!cmd.roleOverrides.some((ro) => ro.roleId === p.target_id)) {
            cmd.roleOverrides.push({ roleId: p.target_id, effect: p.effect === 'DENY' ? 'DENY' : 'ALLOW' });
          }
        } else if (p.target_type === 'user') {
          if (!cmd.userOverrides.some((uo) => uo.userId === p.target_id)) {
            cmd.userOverrides.push({ userId: p.target_id, effect: p.effect === 'DENY' ? 'DENY' : 'ALLOW' });
          }
        }
      }
    });
  } catch (err) {
    console.warn('permits query error:', err);
  }

  return {
    profiles,
    rolePolicies,
    userOverrides,
    commandAcls,
  };
}

export const getGuildPermissions = fetchGuildPermissions;

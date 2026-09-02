import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db, ensureDatabaseSchema } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';
import { BOT_COMMAND_CATALOG } from '@/lib/commands';
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
            cmd.roleOverrides.push({ roleId: p.target_id, effect: 'ALLOW' });
          }
        } else if (p.target_type === 'user') {
          if (!cmd.userOverrides.some((uo) => uo.userId === p.target_id)) {
            cmd.userOverrides.push({ userId: p.target_id, effect: 'ALLOW' });
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await fetchGuildPermissions(guildId);
  return NextResponse.json(permissions);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await ensureDatabaseSchema();

  try {
    const body = await req.json();
    const { action, data } = body;

    if (action === 'save_profiles') {
      const customOnes = (data.profiles || []).filter((p: PermissionProfile) => !p.isPreset);
      await db.begin(async (tx) => {
        await tx`DELETE FROM custom_profiles WHERE guild_id = ${guildId}`;
        for (const cp of customOnes) {
          await tx`
            INSERT INTO custom_profiles (guild_id, profile_id, name, description, inherits_from, permissions)
            VALUES (
              ${guildId},
              ${cp.id},
              ${cp.name},
              ${cp.description || ''},
              ${cp.inheritsFrom || null},
              ${JSON.stringify(cp.permissions || {})}::jsonb
            )
            ON CONFLICT (guild_id, profile_id)
            DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              inherits_from = EXCLUDED.inherits_from,
              permissions = EXCLUDED.permissions,
              updated_at = NOW()
          `;
        }
      });

      await logAuditEvent({
        guildId,
        userId: session.id,
        userName: session.username,
        action: 'Updated Dashboard Access Profiles',
        module: 'permissions',
        newValue: `${customOnes.length} custom profiles saved to database`,
        severity: 'WARNING',
        source: 'DASHBOARD',
      });
    } else if (action === 'save_role_policies') {
      const policies = data.rolePolicies || [];
      await db.begin(async (tx) => {
        await tx`DELETE FROM role_policies WHERE guild_id = ${guildId}`;
        for (const rp of policies) {
          await tx`
            INSERT INTO role_policies (guild_id, role_id, role_name, profile_id, member_count, status)
            VALUES (${guildId}, ${rp.roleId}, ${rp.roleName || 'Role'}, ${rp.profileId}, ${rp.memberCount || 0}, ${rp.status || 'active'})
            ON CONFLICT (guild_id, role_id)
            DO UPDATE SET
              role_name = EXCLUDED.role_name,
              profile_id = EXCLUDED.profile_id,
              member_count = EXCLUDED.member_count,
              status = EXCLUDED.status,
              updated_at = NOW()
          `;
        }
      });

      await logAuditEvent({
        guildId,
        userId: session.id,
        userName: session.username,
        action: 'Updated Role Policy Assignments',
        module: 'permissions',
        newValue: `${policies.length} role assignments saved to database`,
        severity: 'INFO',
        source: 'DASHBOARD',
      });
    } else if (action === 'save_user_overrides') {
      const overrides = data.userOverrides || [];
      await db.begin(async (tx) => {
        await tx`DELETE FROM user_overrides WHERE guild_id = ${guildId}`;
        for (const uo of overrides) {
          await tx`
            INSERT INTO user_overrides (guild_id, user_id, user_name, module, action, effect)
            VALUES (${guildId}, ${uo.userId}, ${uo.userName || 'User'}, ${uo.module}, ${uo.action}, ${uo.effect})
            ON CONFLICT (guild_id, user_id, module, action)
            DO UPDATE SET
              user_name = EXCLUDED.user_name,
              effect = EXCLUDED.effect,
              updated_at = NOW()
          `;
        }
      });

      await logAuditEvent({
        guildId,
        userId: session.id,
        userName: session.username,
        action: 'Updated User Permission Overrides',
        module: 'permissions',
        newValue: `${overrides.length} user overrides saved to database`,
        severity: 'WARNING',
        source: 'DASHBOARD',
      });
    } else if (action === 'save_command_acl') {
      const { command, roleOverrides = [], userOverrides = [] } = data;

      // Sync with PostgreSQL 'permits' table
      await db.begin(async (tx) => {
        await tx`DELETE FROM permits WHERE guild_id = ${guildId} AND command_name = ${command}`;
        for (const ro of roleOverrides) {
          if (ro.effect === 'ALLOW') {
            await tx`
              INSERT INTO permits (guild_id, target_type, target_id, command_name, module_name)
              VALUES (${guildId}, 'role', ${ro.roleId}, ${command}, null)
              ON CONFLICT (guild_id, target_type, target_id, command_name, module_name) DO NOTHING
            `;
          }
        }
        for (const uo of userOverrides) {
          if (uo.effect === 'ALLOW') {
            await tx`
              INSERT INTO permits (guild_id, target_type, target_id, command_name, module_name)
              VALUES (${guildId}, 'user', ${uo.userId}, ${command}, null)
              ON CONFLICT (guild_id, target_type, target_id, command_name, module_name) DO NOTHING
            `;
          }
        }
      });

      await logAuditEvent({
        guildId,
        userId: session.id,
        userName: session.username,
        action: `Modified Command ACL for !${command}`,
        module: 'permissions',
        target: `!${command}`,
        newValue: `${roleOverrides.length} role overrides, ${userOverrides.length} user overrides`,
        severity: 'WARNING',
        source: 'DASHBOARD',
      });
    }

    const updatedPermissions = await fetchGuildPermissions(guildId);
    return NextResponse.json({
      success: true,
      data: updatedPermissions,
      message: 'Permissions configuration persisted to PostgreSQL.',
    });
  } catch (error) {
    console.error('Error saving permissions to database:', error);
    return NextResponse.json({ error: 'Failed to update permissions in PostgreSQL' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild, isGuildOwner } from '@/lib/auth';
import { db, ensureDatabaseSchema } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';
import { BOT_COMMAND_CATALOG } from '@/lib/commands';
import { fetchGuildMember, fetchDiscordUser } from '@/lib/discord';
import {
  DEFAULT_PRESET_PROFILES,
  PermissionProfile,
  RolePolicy,
  UserOverride,
  CommandAcl,
} from '@/lib/permissions';
import { fetchGuildPermissions } from '@/lib/permissionsService';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isOwner = await isGuildOwner(session.id, guildId);
  const permissions = await fetchGuildPermissions(guildId);
  return NextResponse.json({
    ...permissions,
    isOwner,
  });
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
      const isOwner = await isGuildOwner(session.id, guildId);
      if (!isOwner) {
        return NextResponse.json(
          { error: 'Only the Server Owner or Bot Superadmins can modify user overrides.' },
          { status: 403 }
        );
      }
      const overrides: UserOverride[] = data.userOverrides || [];
      const updatedUserIds = new Set(overrides.map((uo) => uo.userId));

      await db.begin(async (tx) => {
        // 1. Fetch previously existing users for this guild to detect deleted/revoked users
        const prevUsers = await tx`SELECT DISTINCT user_id FROM user_overrides WHERE guild_id = ${guildId}`;
        const prevUserIds = new Set(prevUsers.map((r: any) => r.user_id));

        // 2. Full revocation: if an owner deleted a user from user_overrides, remove them from dashboard_access
        const removedUserIds = Array.from(prevUserIds).filter((uid) => !updatedUserIds.has(uid));
        for (const remUid of removedUserIds) {
          await tx`DELETE FROM dashboard_access WHERE user_id = ${remUid}`;
        }

        // 3. Clear and rewrite user_overrides for this guild
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

        // 4. Ensure all active users in updated list are synced to dashboard_access
        for (const uid of Array.from(updatedUserIds)) {
          await tx`
            INSERT INTO dashboard_access (user_id, granted_by, notes)
            VALUES (${uid}, ${session.id}, 'Granted via Web Dashboard')
            ON CONFLICT (user_id) DO NOTHING
          `;
        }
      });

      await logAuditEvent({
        guildId,
        userId: session.id,
        userName: session.username,
        action: 'Updated User Permission Overrides',
        module: 'permissions',
        newValue: `${overrides.length} user overrides saved to database (${updatedUserIds.size} users)`,
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

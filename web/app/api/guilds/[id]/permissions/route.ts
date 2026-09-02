import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';
import { BOT_COMMAND_CATALOG } from '@/lib/commands';
import {
  DEFAULT_PRESET_PROFILES,
  PermissionProfile,
  RolePolicy,
  UserOverride,
  CommandAcl,
} from '@/lib/permissions';

// In-memory persistent cache per guild for permissions state
export const guildPermissionsCache = new Map<
  string,
  {
    profiles: PermissionProfile[];
    rolePolicies: RolePolicy[];
    userOverrides: UserOverride[];
    commandAcls: CommandAcl[];
  }
>();

export function getGuildPermissions(guildId: string) {
  let existing = guildPermissionsCache.get(guildId);
  if (!existing) {
    existing = {
      profiles: [...DEFAULT_PRESET_PROFILES],
      rolePolicies: [],
      userOverrides: [],
      commandAcls: BOT_COMMAND_CATALOG.map((cmd) => ({
        command: cmd.name,
        category: cmd.category,
        description: cmd.description,
        defaultRoleProfile: cmd.defaultRoleProfile,
        requiredDiscordPerm: cmd.requiredDiscordPerm,
        dangerLevel: cmd.dangerLevel,
        roleOverrides: [],
        userOverrides: [],
      })),
    };
    guildPermissionsCache.set(guildId, existing);
  }
  return existing;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load custom permissions state
  const perms = getGuildPermissions(guildId);

  // Sync DB ACL permits from PostgreSQL 'permits' table
  try {
    const permits = await db`SELECT * FROM permits WHERE guild_id = ${guildId}`;
    if (permits.length > 0) {
      permits.forEach((p: any) => {
        const cmdName = p.command_name;
        if (cmdName) {
          const cmd = perms.commandAcls.find((c) => c.command.toLowerCase() === cmdName.toLowerCase());
          if (cmd) {
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
        }
      });
    }
  } catch (err) {
    console.warn('DB permits query fallback:', err);
  }

  return NextResponse.json(perms);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, data } = body;
    const current = getGuildPermissions(guildId);

    if (action === 'save_profiles') {
      current.profiles = data.profiles;
      await logAuditEvent({
        guildId,
        userId: session.id,
        userName: session.username,
        action: 'Updated Dashboard Access Profiles',
        module: 'permissions',
        newValue: `${data.profiles.length} profiles configured`,
        severity: 'WARNING',
        source: 'DASHBOARD',
      });
    } else if (action === 'save_role_policies') {
      current.rolePolicies = data.rolePolicies;
      await logAuditEvent({
        guildId,
        userId: session.id,
        userName: session.username,
        action: 'Updated Role Policy Assignments',
        module: 'permissions',
        newValue: `${data.rolePolicies.length} role assignments`,
        severity: 'INFO',
        source: 'DASHBOARD',
      });
    } else if (action === 'save_user_overrides') {
      current.userOverrides = data.userOverrides;
      await logAuditEvent({
        guildId,
        userId: session.id,
        userName: session.username,
        action: 'Updated User Permission Overrides',
        module: 'permissions',
        newValue: `${data.userOverrides.length} user overrides`,
        severity: 'WARNING',
        source: 'DASHBOARD',
      });
    } else if (action === 'save_command_acl') {
      const { command, roleOverrides, userOverrides } = data;
      const cmd = current.commandAcls.find((c) => c.command.toLowerCase() === command.toLowerCase());
      if (cmd) {
        cmd.roleOverrides = roleOverrides;
        cmd.userOverrides = userOverrides;
      } else {
        current.commandAcls.push({
          command,
          category: 'custom',
          description: `Custom command permit for !${command}`,
          defaultRoleProfile: 'custom',
          dangerLevel: 'MEDIUM',
          roleOverrides,
          userOverrides,
        });
      }

      // Sync directly with canonical PostgreSQL 'permits' table for bot engine parity
      try {
        await db`DELETE FROM permits WHERE guild_id = ${guildId} AND command_name = ${command}`;
        for (const ro of roleOverrides) {
          if (ro.effect === 'ALLOW') {
            await db`
              INSERT INTO permits (guild_id, target_type, target_id, command_name, module_name)
              VALUES (${guildId}, 'role', ${ro.roleId}, ${command}, null)
              ON CONFLICT (guild_id, target_type, target_id, command_name, module_name) DO NOTHING
            `;
          }
        }
        for (const uo of userOverrides) {
          if (uo.effect === 'ALLOW') {
            await db`
              INSERT INTO permits (guild_id, target_type, target_id, command_name, module_name)
              VALUES (${guildId}, 'user', ${uo.userId}, ${command}, null)
              ON CONFLICT (guild_id, target_type, target_id, command_name, module_name) DO NOTHING
            `;
          }
        }
      } catch (err) {
        console.warn('DB permits sync fallback:', err);
      }

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

    guildPermissionsCache.set(guildId, current);
    return NextResponse.json({ success: true, permissions: current });
  } catch (error) {
    console.error('Error saving permissions:', error);
    return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit';
import {
  DEFAULT_PRESET_PROFILES,
  PermissionProfile,
  RolePolicy,
  UserOverride,
  CommandAcl,
} from '@/lib/permissions';

// In-memory persistent cache per guild for permissions state
const guildPermissionsCache = new Map<
  string,
  {
    profiles: PermissionProfile[];
    rolePolicies: RolePolicy[];
    userOverrides: UserOverride[];
    commandAcls: CommandAcl[];
  }
>();

function getGuildPermissions(guildId: string) {
  let existing = guildPermissionsCache.get(guildId);
  if (!existing) {
    existing = {
      profiles: [...DEFAULT_PRESET_PROFILES],
      rolePolicies: [],
      userOverrides: [],
      commandAcls: [
        {
          command: 'purge',
          category: 'moderation',
          description: 'Purges messages from the channel or by role.',
          defaultRoleProfile: 'moderator',
          requiredDiscordPerm: 'Manage Messages',
          dangerLevel: 'HIGH',
          roleOverrides: [],
          userOverrides: [],
        },
        {
          command: 'nuke',
          category: 'moderation',
          description: 'Clones and deletes current channel to wipe chat history completely.',
          defaultRoleProfile: 'administrator',
          requiredDiscordPerm: 'Manage Channels',
          dangerLevel: 'CRITICAL',
          roleOverrides: [],
          userOverrides: [],
        },
        {
          command: 'rw',
          category: 'voice',
          description: 'Renames private voice channel.',
          defaultRoleProfile: 'viewer',
          dangerLevel: 'LOW',
          roleOverrides: [],
          userOverrides: [],
        },
        {
          command: 'bal',
          category: 'economy',
          description: 'Checks wallet and bank balance.',
          defaultRoleProfile: 'viewer',
          dangerLevel: 'LOW',
          roleOverrides: [],
          userOverrides: [],
        },
      ],
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

  // Load custom database permissions if exists
  const perms = getGuildPermissions(guildId);

  // Sync DB ACL overrides if present
  try {
    const permits = await db`SELECT * FROM command_permits WHERE guild_id = ${guildId}`;
    if (permits.length > 0) {
      permits.forEach((p: any) => {
        const cmd = perms.commandAcls.find((c) => c.command === p.command_name);
        if (cmd) {
          if (!cmd.roleOverrides.some((ro) => ro.roleId === p.role_id)) {
            cmd.roleOverrides.push({ roleId: p.role_id, effect: 'ALLOW' });
          }
        } else {
          perms.commandAcls.push({
            command: p.command_name,
            category: 'custom',
            description: `Custom permit for !${p.command_name}`,
            defaultRoleProfile: 'custom',
            dangerLevel: 'MEDIUM',
            roleOverrides: [{ roleId: p.role_id, effect: 'ALLOW' }],
            userOverrides: [],
          });
        }
      });
    }
  } catch {
    // Database fallback
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
      const cmd = current.commandAcls.find((c) => c.command === command);
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

      // Sync with command_permits DB table for bot engine parity
      try {
        await db`DELETE FROM command_permits WHERE guild_id = ${guildId} AND command_name = ${command}`;
        for (const ro of roleOverrides) {
          if (ro.effect === 'ALLOW') {
            await db`
              INSERT INTO command_permits (guild_id, command_name, role_id)
              VALUES (${guildId}, ${command}, ${ro.roleId})
              ON CONFLICT DO NOTHING
            `;
          }
        }
      } catch (err) {
        console.warn('DB command_permits sync fallback:', err);
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

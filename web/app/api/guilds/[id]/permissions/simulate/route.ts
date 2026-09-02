import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManageGuild } from '@/lib/auth';
import { fetchGuildRoles } from '@/lib/discord';
import { db } from '@/lib/db';
import { BOT_COMMAND_CATALOG } from '@/lib/commands';
import {
  MODULE_DEFINITIONS,
  resolveEffectivePermission,
  resolveEffectiveCommandAccess,
  SimulationResponse,
} from '@/lib/permissions';
import { getGuildPermissions } from '../route';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canManageGuild(session.id, guildId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have permissions to simulate access on this server.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const targetType = (searchParams.get('targetType') || 'role') as 'role' | 'user';
  const targetId = searchParams.get('targetId') || '';
  const simulateAdmin = searchParams.get('simulateAdmin') === 'true';

  try {
    // 1. Fetch live Discord roles for metadata
    const roles = await fetchGuildRoles(guildId);
    let subjectName = targetId;
    if (targetType === 'role') {
      const foundRole = roles.find((r) => r.id === targetId);
      if (foundRole) subjectName = foundRole.name;
    }

    // 2. Fetch live database permits from PostgreSQL
    let dbPermits: any[] = [];
    try {
      dbPermits = await db`SELECT * FROM permits WHERE guild_id = ${guildId}`;
    } catch (err) {
      console.warn('DB permits simulation fallback:', err);
    }

    // 3. Fetch guild permissions state (profiles, rolePolicies, userOverrides, commandAcls)
    const permsState = getGuildPermissions(guildId);

    const userRoleIds = targetType === 'role' && targetId ? [targetId] : [];
    const userId = targetType === 'user' ? targetId : 'simulated_user';

    // 4. Resolve Module Permissions
    const moduleEvaluations = MODULE_DEFINITIONS.map((m) => {
      const viewResult = resolveEffectivePermission({
        userId,
        userRoleIds,
        module: m.module,
        action: 'view',
        isOwnerOrAdmin: simulateAdmin,
        profiles: permsState.profiles,
        rolePolicies: permsState.rolePolicies,
        userOverrides: permsState.userOverrides,
      });

      const manageResult = resolveEffectivePermission({
        userId,
        userRoleIds,
        module: m.module,
        action: 'manage',
        isOwnerOrAdmin: simulateAdmin,
        profiles: permsState.profiles,
        rolePolicies: permsState.rolePolicies,
        userOverrides: permsState.userOverrides,
      });

      let conflict = null;
      if (targetType === 'user' && targetId) {
        const userOverride = permsState.userOverrides.find(
          (o) => o.userId === targetId && o.module === m.module
        );
        if (userOverride) {
          conflict = {
            hasConflict: true,
            type: 'USER_OVERRIDE_ACTIVE',
            message: `Explicit user override (${userOverride.effect}) takes deterministic precedence over all role policies.`,
          };
        }
      }

      return {
        module: m,
        canView: viewResult.allowed,
        canManage: manageResult.allowed,
        viewReason: viewResult.reason,
        manageReason: manageResult.reason,
        viewSource: viewResult.source,
        manageSource: manageResult.source,
        conflict,
      };
    });

    // 5. Resolve Command Access across all catalog commands
    const commandEvaluations = BOT_COMMAND_CATALOG.map((cmd) => {
      return resolveEffectiveCommandAccess({
        command: cmd,
        userId,
        userRoleIds,
        isOwnerOrAdmin: simulateAdmin,
        permits: dbPermits,
        commandAcls: permsState.commandAcls,
        rolePolicies: permsState.rolePolicies,
      });
    });

    // 6. Compute summary counters
    const accessibleModules = moduleEvaluations.filter((m) => m.canView).length;
    const restrictedModules = moduleEvaluations.length - accessibleModules;
    const allowedCommands = commandEvaluations.filter((c) => c.effectiveAccess === 'ALLOWED').length;
    const deniedCommands = commandEvaluations.length - allowedCommands;
    const overriddenCommands = commandEvaluations.filter((c) => c.hasOverride).length;

    const responsePayload: SimulationResponse = {
      subject: {
        type: targetType,
        id: targetId,
        name: subjectName,
        isBotAdmin: simulateAdmin,
      },
      summary: {
        totalModules: moduleEvaluations.length,
        accessibleModules,
        restrictedModules,
        totalCommands: commandEvaluations.length,
        allowedCommands,
        deniedCommands,
        overriddenCommands,
      },
      modules: moduleEvaluations,
      commands: commandEvaluations,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Error in permission simulation API:', error);
    return NextResponse.json(
      { error: 'Failed to simulate permissions.' },
      { status: 500 }
    );
  }
}

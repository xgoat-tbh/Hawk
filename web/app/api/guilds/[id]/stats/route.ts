import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs/promises';
import { getSession, canViewGuild } from '@/lib/auth';
import { fetchBotGuilds, fetchGuildDetails } from '@/lib/discord';
import { db, ensureDatabaseSchema } from '@/lib/db';
import { botConnection } from '@/lib/botConnection';

// Module-level state for delta CPU calculation across requests
let lastCpuUsage = process.cpuUsage();
let lastCpuTime = process.hrtime.bigint();

function computeCpuUsage(): number {
  const currentUsage = process.cpuUsage(lastCpuUsage);
  const currentTime = process.hrtime.bigint();
  const timeDiffNs = Number(currentTime - lastCpuTime);
  lastCpuUsage = process.cpuUsage();
  lastCpuTime = currentTime;

  const cpus = os.cpus().length || 1;
  if (timeDiffNs >= 50_000_000) {
    const totalUsageNs = (currentUsage.user + currentUsage.system) * 1000;
    const percent = (totalUsageNs / (timeDiffNs * cpus)) * 100;
    return Math.min(100, Math.max(0, Math.round(percent * 10) / 10));
  }

  // Fallback to cumulative uptime average
  const totalUs = process.cpuUsage().user + process.cpuUsage().system;
  const uptimeUs = process.uptime() * 1_000_000 * cpus;
  return uptimeUs > 0 ? Math.min(100, Math.max(0, Math.round((totalUs / uptimeUs) * 1000) / 10)) : 0;
}

// Cached process count to avoid spawning child processes on every 15s poll
let cachedProcessCount = 0;
let lastProcessCheck = 0;

async function getProcessCount(): Promise<number> {
  const now = Date.now();
  if (cachedProcessCount > 0 && now - lastProcessCheck < 30_000) {
    return cachedProcessCount;
  }
  try {
    if (process.platform === 'win32') {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const { stdout } = await execAsync('tasklist /NH', { timeout: 2000 });
      const count = stdout.trim().split('\n').length;
      if (count > 0) {
        cachedProcessCount = count;
        lastProcessCheck = now;
        return count;
      }
    } else {
      const files = await fs.readdir('/proc');
      const count = files.filter((f) => /^\d+$/.test(f)).length;
      if (count > 0) {
        cachedProcessCount = count;
        lastProcessCheck = now;
        return count;
      }
    }
  } catch {
    // Fallback if permission/platform fails
  }
  return cachedProcessCount || 1;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const allowed = await canViewGuild(session.id, guildId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await ensureDatabaseSchema();

  try {
    const hawkClient = (globalThis as any).hawkClient;
    const [botGuilds, guildDetails] = await Promise.all([
      fetchBotGuilds(),
      fetchGuildDetails(guildId),
    ]);
    const targetGuild = botGuilds.find((g) => g.id === guildId);
    const cachedGuild = hawkClient?.guilds?.cache?.get(guildId);

    // 1. Members count & Presence count (real Discord API or cached client)
    const memberCount =
      cachedGuild?.memberCount ??
      guildDetails?.approximate_member_count ??
      targetGuild?.approximateMemberCount ??
      targetGuild?.memberCount ??
      0;

    const presenceCount =
      cachedGuild?.approximatePresenceCount ??
      guildDetails?.approximate_presence_count ??
      null;

    const connection = botConnection(hawkClient, guildId);
    const gatewayLatencyMs = connection.gatewayLatencyMs;

    // 3. System Health (Real CPU, Memory, Disk, Uptime, Node version)
    const memUsage = process.memoryUsage();
    const memoryPercent = memUsage.heapTotal > 0
      ? Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      : 0;

    const cpuPercent = computeCpuUsage();
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMins = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeStr = uptimeHours > 0 ? `${uptimeHours}h ${uptimeMins}m` : `${uptimeMins}m`;

    let diskPercent = 0;
    try {
      const stat = await fs.statfs(process.cwd());
      if (stat.blocks > 0) {
        diskPercent = Math.round(((stat.blocks - stat.bavail) / stat.blocks) * 100);
      }
    } catch {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      diskPercent = totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 100) : 0;
    }

    const processCount = await getProcessCount();

    // Determine system status
    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (cpuPercent > 90 || memoryPercent > 90 || (gatewayLatencyMs !== null && gatewayLatencyMs > 500)) {
      healthStatus = 'critical';
    } else if (cpuPercent > 75 || memoryPercent > 75 || (gatewayLatencyMs !== null && gatewayLatencyMs > 250)) {
      healthStatus = 'degraded';
    }

    // 4. Real Active modules count for the 8 core modules in overview grid
    let activeModulesCount = 0;
    const [econ, welcome, stickies, gamePings, store, income, suggestions, confessions] = await Promise.all([
      db`SELECT pvc_jtc_channel_id, daily_reward_amount, passive_income FROM economy_config WHERE guild_id = ${guildId}`.catch(() => []),
      db`SELECT greet_enabled, greet_channel_id FROM welcome_configs WHERE guild_id = ${guildId}`.catch(() => []),
      db`SELECT COUNT(*)::int as count FROM sticky_messages WHERE guild_id = ${guildId}`.catch(() => []),
      db`SELECT COUNT(*)::int as count FROM game_pings WHERE guild_id = ${guildId}`.catch(() => []),
      db`SELECT COUNT(*)::int as count FROM store_items WHERE guild_id = ${guildId}`.catch(() => []),
      db`SELECT COUNT(*)::int as count FROM income_roles WHERE guild_id = ${guildId}`.catch(() => []),
      db`SELECT channel_id FROM suggestion_configs WHERE guild_id = ${guildId}`.catch(() => []),
      db`SELECT channel_id FROM confession_configs WHERE guild_id = ${guildId}`.catch(() => []),
    ]);

    const moduleStatus = {
      welcome: Boolean(welcome[0]?.greet_enabled && welcome[0]?.greet_channel_id),
      pvc: Boolean(econ[0]?.pvc_jtc_channel_id),
      economy: Boolean(econ[0]?.daily_reward_amount || econ[0]?.passive_income),
      store: (store[0]?.count || 0) > 0,
      sticky: (stickies[0]?.count || 0) > 0,
      gaming: (gamePings[0]?.count || 0) > 0,
      community: Boolean(suggestions[0]?.channel_id || confessions[0]?.channel_id),
      income: (income[0]?.count || 0) > 0,
    };

    Object.values(moduleStatus).forEach((active) => {
      if (active) activeModulesCount++;
    });
    const totalModules = 8;

    // 5. Real Messages/Events per hour
    const [actHr, auditHr, teleHr] = await Promise.all([
      db`SELECT COUNT(*)::int as c FROM activity_log WHERE guild_id = ${guildId} AND created_at > NOW() - INTERVAL '1 hour'`.catch(() => [{ c: 0 }]),
      db`SELECT COUNT(*)::int as c FROM economy_audit_log WHERE guild_id = ${guildId} AND created_at > NOW() - INTERVAL '1 hour'`.catch(() => [{ c: 0 }]),
      db`SELECT COUNT(*)::int as c FROM command_telemetry WHERE guild_id = ${guildId} AND created_at > NOW() - INTERVAL '1 hour'`.catch(() => [{ c: 0 }]),
    ]);
    const currentMessagesPerHr = (actHr[0]?.c || 0) + (auditHr[0]?.c || 0) + (teleHr[0]?.c || 0);

    // 6. Recent Activity (for legacy support during phase transition)
    const [recentLogs, recentAudits] = await Promise.all([
      db`
        SELECT id, type, actor_name, target_name, created_at
        FROM activity_log
        WHERE guild_id = ${guildId}
        ORDER BY created_at DESC
        LIMIT 5
      `.catch(() => []),
      db`
        SELECT id, action, actor_id, target_id, amount, details, created_at
        FROM economy_audit_log
        WHERE guild_id = ${guildId}
        ORDER BY created_at DESC
        LIMIT 5
      `.catch(() => []),
    ]);

    const combinedEvents: any[] = [];
    for (const r of recentLogs) {
      combinedEvents.push({
        id: `act_${r.id}`,
        type: r.type,
        actorName: r.actor_name || 'System',
        targetName: r.target_name || '',
        createdAt: new Date(r.created_at).getTime(),
      });
    }

    for (const a of recentAudits) {
      combinedEvents.push({
        id: `eco_${a.id}`,
        type: a.action === 'DAILY_CLAIM' ? 'streak_reward' : 'role_reward',
        actorName: a.actor_id ? `<@${a.actor_id}>` : 'Member',
        targetName: a.details || `${a.action} (${a.amount || ''})`,
        createdAt: new Date(a.created_at).getTime(),
      });
    }

    combinedEvents.sort((a, b) => b.createdAt - a.createdAt);
    const recentActivity = combinedEvents.slice(0, 5).map((e) => {
      const diffMs = Date.now() - e.createdAt;
      const diffMins = Math.max(1, Math.round(diffMs / (60 * 1000)));
      const relativeTime =
        diffMins < 60
          ? `${diffMins}m ago`
          : diffMins < 1440
          ? `${Math.round(diffMins / 60)}h ago`
          : `${Math.round(diffMins / 1440)}d ago`;

      return {
        id: e.id,
        type: e.type,
        actorName: e.actorName,
        targetName: e.targetName,
        relativeTime,
      };
    });

    // Group by real timestamps, rather than combining UTC database hours with
    // a local server clock (which shifted the chart in non-UTC time zones).
    const hours = await db`
      WITH buckets AS (
        SELECT generate_series(date_trunc('hour', NOW()) - INTERVAL '23 hours', date_trunc('hour', NOW()), INTERVAL '1 hour') AS hour
      ), events AS (
        SELECT date_trunc('hour', created_at) AS hour FROM activity_log WHERE guild_id = ${guildId} AND created_at > NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT date_trunc('hour', created_at) AS hour FROM command_telemetry WHERE guild_id = ${guildId} AND created_at > NOW() - INTERVAL '24 hours'
      )
      SELECT buckets.hour, COUNT(events.hour)::int AS count FROM buckets LEFT JOIN events ON buckets.hour = events.hour GROUP BY buckets.hour ORDER BY buckets.hour
    `;
    const activityChart = hours.map((row: any) => ({ hour: new Date(row.hour).toISOString(), count: row.count }));

    return NextResponse.json({
      // Primary required interface
      memberCount,
      presenceCount,
      messagesPerHour: currentMessagesPerHr,
      activeModules: activeModulesCount,
      totalModules,
      gatewayLatencyMs,
      connection,
      systemHealth: {
        cpu: cpuPercent,
        memory: memoryPercent,
        disk: diskPercent,
        uptimeSeconds,
        uptimeStr,
        processCount,
        nodeVersion: process.version,
        status: healthStatus,
        uptime: uptimeStr,
        gateway: gatewayLatencyMs,
      },
      // Module status map for client UI
      modules: moduleStatus,
      // Backward compatibility aliases for transition
      summary: {
        members: memberCount,
        presenceCount,
        memberChangePct: 0,
        messagesPerHr: currentMessagesPerHr,
        messagesChangePct: 0,
        modulesActive: activeModulesCount,
        modulesTotal: totalModules,
        gatewayPing: gatewayLatencyMs,
      },
      recentActivity,
      activityChart,
    });
  } catch (err: any) {
    console.error('Failed to get guild stats:', err);
    return NextResponse.json({ error: 'Failed to retrieve stats' }, { status: 500 });
  }
}

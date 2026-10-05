import { invalidatePermitCache } from '../database/repositories/permissionRepo.js';
import { invalidateEconomyConfigCache } from '../database/repositories/economyConfigRepo.js';
import { invalidateGuildConfig } from '../database/repositories/guildConfigRepo.js';
import type http from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { Client } from 'discord.js';
import { getDb } from '../database/pool.js';
import { botConnection } from './botConnection.js';
let io: Server | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let subscription: { unlisten: () => Promise<void> } | undefined;
const handshakeAttempts = new Map<string, number[]>();
async function authorized(socket: Socket): Promise<boolean> {
  const { guildId, token } = socket.data as { guildId: string; token: string };
  const supported = [process.env.MAIN_GUILD_ID || '1517584175677308998', process.env.TEST_GUILD_ID || '1493322410567401722'];
  if (!supported.includes(guildId) || !/^[a-f0-9]{64}$/.test(token || '')) return false;
  const db = getDb();
  const [session] = await db`SELECT user_id FROM dashboard_sessions WHERE token = ${token} AND expires_at > NOW()`;
  if (!session) return false;
  const client = (globalThis as unknown as { hawkClient?: Client }).hawkClient;
  const guild = client?.guilds.cache.get(guildId);
  if (!guild) return false;
  const ids = [process.env.BOT_OWNER_ID, process.env.BOT_OWNER_IDS, process.env.BOT_ADMIN_IDS].filter(Boolean).join(',').split(',').map(v => v.trim());
  if (ids.includes(session.user_id)) return true;
  const [access] = await db`SELECT 1 FROM dashboard_access WHERE user_id = ${session.user_id}`;
  if (access) return true;
  const member = await guild.members.fetch(session.user_id).catch(() => null);
  return Boolean(member && (guild.ownerId === member.id || member.permissions.has('Administrator') || member.permissions.has('ManageGuild')));
}
export async function attachDashboardSocket(server: http.Server): Promise<void> {
  io = new Server(server, { path: '/api/socketio', transports: ['websocket'], maxHttpBufferSize: 16_384, serveClient: false });
  io.use(async (socket, next) => {
    try {
      const ip = (process.env.TRUST_PROXY === 'true' ? socket.handshake.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 'unknown' : socket.request.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
      const allowedIps = process.env.ALLOWED_IPS?.split(',').map(v => v.trim()).filter(Boolean);
      if (allowedIps?.length && !allowedIps.includes(ip)) return next(new Error('IP not allowed'));
      const now = Date.now();
      const attempts = (handshakeAttempts.get(ip) || []).filter(time => time > now - 60_000);
      if (attempts.length >= 20) return next(new Error('Too many connection attempts'));
      if (handshakeAttempts.size >= 10_000) { for (const [key, times] of handshakeAttempts) if (times[times.length - 1] < now - 60_000) handshakeAttempts.delete(key); if (handshakeAttempts.size >= 10_000) return next(new Error('Too many connections')); }
      handshakeAttempts.set(ip, [...attempts, now]);
      const origin = socket.handshake.headers.origin;
      const secure = ('encrypted' in socket.request.socket && socket.request.socket.encrypted) || (process.env.TRUST_PROXY === 'true' && socket.handshake.headers['x-forwarded-proto'] === 'https');
      const expected = process.env.DASHBOARD_ORIGIN || `${secure ? 'https' : 'http'}://${socket.handshake.headers.host}`;
      if (!origin || new URL(origin).origin !== new URL(expected).origin) return next(new Error('Invalid origin'));
      const cookies = Object.fromEntries((socket.handshake.headers.cookie || '').split(';').map(c => { const i = c.indexOf('='); return [c.slice(0, i).trim(), c.slice(i + 1)]; }));
      if (!/^[a-f0-9]{64}$/.test(cookies.hawk_csrf || '') || socket.handshake.auth.csrf !== cookies.hawk_csrf) return next(new Error('Invalid CSRF token'));
      socket.data = { guildId: socket.handshake.auth.guildId, token: cookies.hawk_session };
      if ([...(io?.sockets.sockets.values() || [])].filter(s => s.data.token === cookies.hawk_session).length >= 5) return next(new Error('Too many active connections'));
      if (!await authorized(socket)) return next(new Error('Unauthorized'));
      next();
    } catch { next(new Error('Authorization unavailable')); }
  });
  io.on('connection', socket => { void socket.join(`guild:${socket.data.guildId}`); });
  subscription = await getDb().listen('dashboard_events', payload => {
    try { const event = JSON.parse(payload); if (event.event === 'config:changed') { invalidateGuildConfig(event.guildId); invalidateEconomyConfigCache(event.guildId); invalidatePermitCache(event.guildId); } if (/^\d{17,20}$/.test(event.guildId) && ['activity:new','config:changed','pvc:update','economy:transaction'].includes(event.event)) io?.to(`guild:${event.guildId}`).emit(event.event, { guildId: event.guildId }); } catch { /* Malformed notifications are ignored. */ }
  });
  let running = false;
  let cpuBaseline = process.cpuUsage(); let cpuTime = process.hrtime.bigint();
  timer = setInterval(async () => {
    if (running || !io) return; running = true;
    try {
      const guilds = new Set<string>();
      for (const socket of io.sockets.sockets.values()) { if (!await authorized(socket)) socket.disconnect(true); else guilds.add(socket.data.guildId); }
      const client = (globalThis as unknown as { hawkClient?: Client }).hawkClient;
      const elapsed = Number(process.hrtime.bigint() - cpuTime) / 1000;
      const usage = process.cpuUsage(cpuBaseline); cpuBaseline = process.cpuUsage(); cpuTime = process.hrtime.bigint();
      const cpu = Math.min(100, Math.round((usage.user + usage.system) / Math.max(1, elapsed) * 100));
      const memoryUsage = process.memoryUsage(); const memory = Math.round(memoryUsage.heapUsed / Math.max(1, memoryUsage.heapTotal) * 100);
      const minutes = Math.floor(process.uptime() / 60); const uptimeStr = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
      for (const guildId of guilds) {
        const guild = client?.guilds.cache.get(guildId); if (!guild) continue;
        const [hour] = await getDb()`SELECT (
          (SELECT COUNT(*) FROM activity_log WHERE guild_id = ${guildId} AND created_at > NOW() - INTERVAL '1 hour') +
          (SELECT COUNT(*) FROM economy_audit_log WHERE guild_id = ${guildId} AND created_at > NOW() - INTERVAL '1 hour') +
          (SELECT COUNT(*) FROM command_telemetry WHERE guild_id = ${guildId} AND created_at > NOW() - INTERVAL '1 hour')
        )::int AS count`;
        const connection = botConnection(client, guildId);
        const gatewayLatencyMs = connection.gatewayLatencyMs;
        const status = cpu > 90 || memory > 90 || (gatewayLatencyMs !== null && gatewayLatencyMs > 500) ? 'critical' : cpu > 75 || memory > 75 || (gatewayLatencyMs !== null && gatewayLatencyMs > 250) ? 'degraded' : 'healthy';
        io.to(`guild:${guildId}`).emit('stats:update', { guildId, connection, memberCount: guild.memberCount, messagesPerHour: hour.count, gatewayLatencyMs, voiceUsers: guild.voiceStates.cache.filter(v => v.channelId).size, systemHealth: { cpu, memory, uptimeStr, nodeVersion: process.version, status } });
      }
    } catch (error) { console.warn('Dashboard telemetry unavailable:', error instanceof Error ? error.message : String(error)); }
    finally { running = false; }
  }, 15_000);
  timer.unref();
}
export async function closeDashboardSocket() { if (timer) clearInterval(timer); await subscription?.unlisten(); io?.close(); io = undefined; }

'use client';
import { io, type Socket } from 'socket.io-client';
const sockets = new Map<string, { socket: Socket; users: number }>();
export function acquireSocket(guildId: string): Socket {
  const current = sockets.get(guildId);
  if (current) { current.users++; return current.socket; }
  const socket = io({ path: '/api/socketio', transports: ['websocket'], autoConnect: false, auth: callback => callback({ guildId, csrf: document.cookie.split('; ').find(v => v.startsWith('hawk_csrf='))?.slice(10) }) });
  sockets.set(guildId, { socket, users: 1 });
  fetch('/api/auth/csrf').then(r => { if (r.ok && sockets.get(guildId)?.socket === socket) socket.connect(); }).catch(() => {});
  return socket;
}
export function releaseSocket(guildId: string) { const entry = sockets.get(guildId); if (entry && --entry.users === 0) { entry.socket.disconnect(); sockets.delete(guildId); } }

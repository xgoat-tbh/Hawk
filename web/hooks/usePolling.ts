'use client';
import { acquireSocket, releaseSocket } from '@/lib/socket';
import { useEffect, useRef, useCallback, useState } from 'react';

interface UsePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
  guildId?: string;
}

export function usePolling(
  callback: () => Promise<void> | void,
  { intervalMs = 5000, enabled = true, guildId }: UsePollingOptions = {},
) {
  const [connected, setConnected] = useState(false);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const refresh = useCallback(async () => {
    try {
      await savedCallback.current();
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, []);

  useEffect(() => {
    if (!guildId || !enabled) return;
    const socket = acquireSocket(guildId);
    const online = () => { setConnected(true); void refresh(); };
    const offline = () => setConnected(false);
    const changed = () => { void refresh(); };
    socket.on('connect', online); socket.on('disconnect', offline);
    for (const event of ['config:changed','activity:new','pvc:update','economy:transaction']) socket.on(event, changed);
    setConnected(socket.connected);
    return () => { socket.off('connect', online); socket.off('disconnect', offline); for (const event of ['config:changed','activity:new','pvc:update','economy:transaction']) socket.off(event, changed); releaseSocket(guildId); };
  }, [guildId, enabled, refresh]);
  useEffect(() => {
    if (!enabled || connected) return;

    // Initial fetch
    refresh();

    const id = setInterval(() => {
      refresh();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, enabled, connected, refresh]);

  return { refresh, connected };
}

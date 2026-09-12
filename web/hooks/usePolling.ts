import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export function usePolling(
  callback: () => Promise<void> | void,
  { intervalMs = 5000, enabled = true }: UsePollingOptions = {},
) {
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
    if (!enabled) return;

    // Initial fetch
    refresh();

    const id = setInterval(() => {
      refresh();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, enabled, refresh]);

  return { refresh };
}

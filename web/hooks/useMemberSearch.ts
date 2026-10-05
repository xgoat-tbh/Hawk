'use client';
import { apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';
import type { UserOption } from '@/components/ui/UserPicker';
const cache = new Map<string, { at: number; users: UserOption[] }>();
export function useMemberSearch(guildId: string, query: string) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setUsers([]); setError(null); setLoading(false);
    if (!guildId || query.trim().length < 2) return;
    const key = `${guildId}:${query.trim().toLowerCase()}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 30_000) { setUsers(hit.users); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/guilds/${guildId}/members?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to search members');
        if (controller.signal.aborted) return;
        if (cache.size > 100) cache.clear();
        cache.set(key, { at: Date.now(), users: data.users }); setUsers(data.users);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to search members'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [guildId, query]);
  return { users, error, loading };
}

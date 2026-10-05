'use client';
import { apiFetch } from '@/lib/api';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { HawkSelect } from '@/components/ui/HawkSelect';
import type { DiscordGuild } from '@/lib/discord';
import { useGuildData } from '@/context/GuildContext';
interface ServerSwitcherModalProps { isOpen: boolean; onClose: () => void; memberCount?: number; modulesActive?: number; }
export function ServerSwitcherModal({ isOpen, onClose }: ServerSwitcherModalProps) {
  const { guildId } = useGuildData(); const router = useRouter();
  const [guilds,setGuilds] = useState<DiscordGuild[]>([]); const [error,setError] = useState<string | null>(null); const [loading,setLoading] = useState(false); const [retry,setRetry] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController(); setLoading(true); setError(null);
    apiFetch('/api/guilds',{signal:controller.signal}).then(async r => { if (!r.ok) throw new Error('Unable to load your servers. Try again.'); const data = await r.json(); setGuilds(data.guilds || []); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[isOpen,retry]);
  return <AnimatedModal isOpen={isOpen} onClose={onClose} title="Switch server" subtitle="Choose a server you are authorized to manage."><HawkSelect label="Server" value={guildId} loading={loading} error={error} onRetry={() => setRetry(v => v+1)} options={guilds.map(g => ({value:g.id,label:g.name,description:g.id,icon:g.icon ? <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=32`} alt="" className="w-7 h-7 rounded-md"/> : undefined}))} onChange={id => { onClose(); router.push(`/dashboard/${id}`); }}/>{error && <p role="alert" className="text-critical-text text-xs mt-3">{error}<button className="btn-ghost ml-2" onClick={() => setRetry(v=>v+1)}>Retry</button></p>}</AnimatedModal>;
}

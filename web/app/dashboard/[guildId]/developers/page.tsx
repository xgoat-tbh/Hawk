'use client';
import { apiFetch } from '@/lib/api';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useGuildData } from '@/context/GuildContext';
import { usePolling } from '@/hooks/usePolling';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
interface Telemetry { gatewayLatencyMs?: number; activeModules?: number; totalModules?: number; systemHealth?: {cpu?:number;memory?:number;disk?:number;uptimeStr?:string;processCount?:number;nodeVersion?:string;status?:string}; }
export default function DevelopersTelemetryPage() {
  const { guildId } = useParams() as {guildId:string}; const { bot, isOwner, userPermissions } = useGuildData();
  const [stats,setStats] = useState<Telemetry | null>(null); const [error,setError] = useState<string | null>(null); const [catalog,setCatalog] = useState<number | null>(null); const [loading,setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    try { const res = await apiFetch(`/api/guilds/${guildId}/stats`,{signal:controller.signal}); if (!res.ok) throw new Error('Telemetry is unavailable. Check your connection and retry.'); const data=await res.json(); if (!controller.signal.aborted) {setStats(data);setError(null);} }
    catch(e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Telemetry unavailable'); }
  },[guildId]);
  usePolling(refresh,{intervalMs:15000}); useEffect(()=>()=>request.current?.abort(),[]);
  const refreshCatalog = async () => {
    setLoading(true); try { const res=await apiFetch('/api/commands'); if (!res.ok) throw new Error('Unable to load command catalog.'); const data=await res.json(); setCatalog(data.commands.length);setError(null); }
    catch(e) {setError(e instanceof Error ? e.message : 'Unable to load catalog.');} finally {setLoading(false);}
  };
  const health=stats?.systemHealth;
  return <div className="space-y-7 max-w-5xl mx-auto">
    <PageHeader guildId={guildId} title="Bot status & integrations" description="Inspect reported runtime health and the Discord connection for this server." actions={<button className="btn-secondary" onClick={refresh}><RefreshCw size={14} className="mr-2"/>Refresh telemetry</button>}/>
    {error && <p role="alert" className="text-warning-text text-sm">{error}</p>}
    <section className="flex flex-wrap items-center gap-4 border-b border-border pb-5"><h2 className="font-semibold">Dashboard runtime</h2><StatusBadge status={error ? 'Update failed' : health?.status || 'Awaiting telemetry'} variant={error ? 'warning' : health?.status==='healthy' ? 'operational' : 'neutral'}/><p className="text-xs text-text-muted">Values are reported by the dashboard process.</p></section>
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['CPU usage',health?.cpu],['Memory usage',health?.memory],['Disk usage',health?.disk],['Latency',stats?.gatewayLatencyMs]].map(([name,value])=><div className="stat-card" key={name}><span className="text-xs text-text-secondary">{name}</span><span className="text-2xl font-display mt-3">{value == null ? '—' : `${value}${name==='Latency' ? ' ms' : '%'}`}</span></div>)}</section>
    <section className="hawk-settings-section"><h2>Runtime details</h2><dl className="divide-y divide-border">{[['Node.js',health?.nodeVersion],['Uptime',health?.uptimeStr],['Reported processes',health?.processCount],['Active modules',stats ? `${stats.activeModules} / ${stats.totalModules}` : null]].map(([name,value])=><div className="py-4 flex justify-between gap-4 text-sm" key={name}><dt className="text-text-secondary">{name}</dt><dd className="font-mono">{value ?? '—'}</dd></div>)}</dl></section>
    <section className="hawk-settings-section"><h2>Discord integration</h2><div className="setting-row"><div><span className="font-medium">Bot identity</span><p>{bot?.username || 'Unavailable'}</p></div><code className="text-sm">{bot?.id || '—'}</code></div><div className="setting-row"><div><span className="font-medium">Command catalog</span><p>{catalog == null ? 'Load the current command metadata from Hawk.' : `${catalog} commands returned by the catalog API.`}</p></div><button className="btn-secondary justify-self-start" onClick={refreshCatalog} disabled={loading}>{loading ? 'Loading…' : 'Refresh catalog'}</button></div><p className="text-xs text-text-muted">Catalog refresh reads command metadata. Command registration is managed by the bot runtime.</p></section>
    <section className="hawk-settings-section"><h2>Service controls</h2><div className="setting-row"><div><span className="font-medium">Restart bot / clear runtime cache</span><p>This deployment does not expose a service-control endpoint. Use your process manager to perform these operations.</p></div><span className="text-xs text-text-muted">Unavailable in dashboard</span></div></section>
    <section><h2 className="font-semibold mb-3">Your access</h2><p className="text-sm text-text-secondary">{isOwner ? 'Server owner' : userPermissions?.isAdmin ? 'Administrator' : 'Delegated dashboard access'}</p><Link href={`/dashboard/${guildId}/permissions?tab=simulator`} className="btn-secondary mt-3">Inspect access resolution</Link></section>
  </div>;
}

'use client';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/api';
import { acquireSocket, releaseSocket } from '@/lib/socket';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, ArrowUpRight, RefreshCw, Shield, Settings, ChevronRight, Terminal, Maximize2 } from 'lucide-react';
import { useGuildData } from '@/context/GuildContext';
import { usePolling } from '@/hooks/usePolling';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { HawkScrollArea } from '@/components/ui/HawkScrollArea';
import { AnimatedDrawer } from '@/components/ui/AnimatedDrawer';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
const ActivityChart = dynamic(() => import('@/components/Overview/ActivityChart'), { ssr: false });
interface Stats {
  activityChart?: { hour: string; messages?: number; commands?: number; count?: number }[];
  memberCount?: number; presenceCount?: number | null; messagesPerHour?: number; activeModules?: number; totalModules?: number; gatewayLatencyMs?: number | null;
  connection?: { status: string; botReady: boolean; guildAvailable: boolean };
  modules?: Record<string, boolean>;
  systemHealth?: { cpu?: number; memory?: number; disk?: number; uptimeStr?: string; nodeVersion?: string; status?: string };
}
interface Entry { id: string; timestamp?: string; time?: string; description?: string; actorName?: string; targetName?: string; eventType?: string; type?: string; }
export default function GuildOverviewPage() {
  const { guildId } = useParams() as { guildId: string };
  const { guild, bot } = useGuildData(); const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null); const [logs, setLogs] = useState<Entry[]>([]);
  const [failure, setFailure] = useState<string | null>(null); const [updated, setUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true); const [expanded, setExpanded] = useState(false); const [follow, setFollow] = useState(false); const [command, setCommand] = useState('');
  const logRef = useRef<HTMLDivElement>(null); const request = useRef<AbortController | null>(null);
  const fetchOverview = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    try {
      const [statResponse, activityResponse] = await Promise.all([apiFetch(`/api/guilds/${guildId}/stats`, { signal: controller.signal }), apiFetch(`/api/guilds/${guildId}/activity?limit=30`, { signal: controller.signal })]);
      if (!statResponse.ok || !activityResponse.ok) throw new Error('Unable to refresh server activity. Check your access and try again.');
      const [nextStats, activity] = await Promise.all([statResponse.json(), activityResponse.json()]);
      if (controller.signal.aborted) return;
      setStats(nextStats); setLogs(activity.entries || activity.items || []); setFailure(null); setUpdated(new Date());
    } catch (err) { if (!controller.signal.aborted) setFailure(err instanceof Error ? err.message : 'Unable to load overview.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [guildId]);
  const { connected: liveConnected } = usePolling(fetchOverview, { intervalMs: 15000, guildId });
  useEffect(() => { const socket = acquireSocket(guildId); const update = (next: Partial<Stats>) => { setStats(previous => ({ ...previous, ...next })); setUpdated(new Date()); }; socket.on('stats:update', update); return () => { socket.off('stats:update', update); releaseSocket(guildId); }; }, [guildId]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (follow && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs, follow]);
  const modules = [
    ['welcome', 'Welcome greetings', 'Greet new members in the right channel.', '/welcome'],
    ['economy', 'Economy & rewards', 'Manage currency, rewards, and balances.', '/economy'],
    ['pvc', 'Private voice', 'Member-owned voice rooms and defaults.', '/pvc'],
    ['store', 'Store catalog', 'Purchasable items and role rewards.', '/store'],
    ['income', 'Role salaries', 'Recurring income for server roles.', '/income'],
    ['gaming', 'Gaming LFG', 'Matchmaking and gaming notifications.', '/gaming'],
    ['community', 'Community tools', 'Suggestions, feedback, and confessions.', '/community'],
    ['sticky', 'Sticky notices', 'Keep important messages in view.', '/sticky'],
  ];
  const display = (n?: number) => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : '—';
  const health = stats?.systemHealth;
  const connectionLabel = stats?.connection?.status === 'connected' ? 'Connected' : stats?.connection?.status === 'disconnected' ? 'Reconnecting' : stats?.connection?.status === 'guild-unavailable' ? 'Server unavailable' : stats?.connection?.status === 'unavailable' ? 'Bot unavailable' : 'Checking';
  const logContent = <>{!logs.length ? (
    loading ? (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/40">
            <Skeleton className="w-16 h-3.5" />
            <Skeleton className="w-24 h-3.5" />
            <Skeleton className="w-48 h-3.5 flex-1" />
          </div>
        ))}
      </div>
    ) : (
      <div className="hawk-empty">No recent activity. New server events will appear here.</div>
    )
  ) : <table className="w-full text-xs"><thead className="sticky top-0"><tr><th>Time</th><th>Event</th><th>Details</th></tr></thead><tbody>{logs.map((entry, index) => <tr key={entry.id || `${entry.timestamp}-${index}`}><td className="whitespace-nowrap text-text-muted"><time>{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : entry.time || '—'}</time></td><td className="text-text-secondary whitespace-nowrap">{entry.eventType || entry.type || 'Event'}</td><td className="text-text-primary min-w-[220px]">{entry.description || [entry.actorName, entry.targetName].filter(Boolean).join(' · ') || 'No description provided'}</td></tr>)}</tbody></table>}</>;
  const submitCommand = (e: React.FormEvent) => {
    e.preventDefault(); const input = command.trim().toLowerCase(); setCommand('');
    if (input === 'clear') setLogs([]);
    else if (input === 'sync' || input === 'refresh') void fetchOverview();
    else if (input === 'ping') toast.info(stats?.gatewayLatencyMs == null ? 'Latency is unavailable.' : `Reported latency: ${stats.gatewayLatencyMs} ms`);
    else if (input === 'stats') toast.info(`Members: ${display(stats?.memberCount)} · Active modules: ${display(stats?.activeModules)}`);
    else toast.info('Console commands: refresh, clear, ping, stats, help. Bot commands run in Discord.');
  };
  return <div className="space-y-7">
    <PageHeader guildId={guildId} title="Server overview" description="A clear view of your server, its configuration, and recent activity."
      actions={<button className="btn-secondary" onClick={fetchOverview} disabled={loading}><RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`}/>{loading ? 'Refreshing…' : 'Refresh'}</button>}/>
    <section className="flex flex-col sm:flex-row gap-5 sm:items-center justify-between pb-6 border-b border-border">
      <div className="flex items-center gap-4">{guild?.iconUrl ? <img src={guild.iconUrl} alt="" className="w-14 h-14 rounded-lg"/> : <span className="w-14 h-14 rounded-lg bg-surface-4 flex items-center justify-center font-display text-xl">{guild?.name?.[0]}</span>}<div><h2 className="text-xl font-semibold">{guild?.name}</h2><p className="text-xs text-text-muted mt-1">{bot?.username || 'Hawk'}{bot?.id && <span className="font-mono ml-2">{bot.id}</span>}</p></div></div>
      <div className="flex gap-2"><Link href={`/dashboard/${guildId}/permissions`} className="btn-secondary"><Shield size={14} className="mr-2"/>Manage access</Link><Link href={`/dashboard/${guildId}/general`} className="btn-primary"><Settings size={14} className="mr-2"/>Configure bot</Link></div>
    </section>
    {failure && <div role="alert" className="flex flex-wrap gap-3 text-warning-text text-sm"><span>{failure}{stats && ' Showing last received values.'}</span><button onClick={fetchOverview} className="underline">Retry</button></div>}
    <section className="flex flex-wrap gap-4 items-center text-xs" aria-label="System health" aria-live="polite"><Activity size={16} className="text-text-muted"/><span className="font-medium">Discord gateway</span><StatusBadge status={connectionLabel} variant={stats?.connection?.status === 'connected' ? 'operational' : 'warning'}/><span className="text-text-muted">{liveConnected ? 'Live updates connected' : 'Periodic updates'}</span><span className="text-text-muted">Runtime {health?.status || '—'} · Uptime <span className="font-mono text-text-secondary">{health?.uptimeStr || '—'}</span></span><span className="text-text-muted sm:ml-auto">{updated ? `Updated ${updated.toLocaleTimeString()}` : 'Loading server data'}</span></section>
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" aria-label="Server statistics" data-animate-section>
      {[['Members', display(stats?.memberCount), stats?.presenceCount == null ? 'Server membership' : `${display(stats.presenceCount)} online`], ['Activity this hour', display(stats?.messagesPerHour), 'Recorded server events'], ['Active modules', stats ? `${display(stats.activeModules)} / ${display(stats.totalModules)}` : '—', 'Based on saved configuration'], ['Reported latency', stats?.gatewayLatencyMs == null ? '—' : `${stats.gatewayLatencyMs} ms`, 'Discord gateway heartbeat']].map(([label, value, note]) => (
        <div className="stat-card" key={label}>
          <div className="text-xs text-text-secondary">{label}</div>
          {loading && !stats ? (
            <div className="my-2 flex items-center">
              <Skeleton className="h-8 w-28 rounded" />
            </div>
          ) : (
            <div className="font-display text-3xl mt-3 mb-2 tracking-tight tabular-nums">{value}</div>
          )}
          <div className="text-xs text-text-muted">{note}</div>
        </div>
      ))}
    </section>
    <section className="surface-container p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold">Activity · last 24 hours</h2>
        {loading && !stats?.activityChart && <span className="text-xs text-text-muted flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin" /> Syncing data…</span>}
      </div>
      {loading && !stats?.activityChart ? (
        <div className="h-64 flex items-center justify-center p-4">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      ) : (
        <ActivityChart data={stats?.activityChart || []}/>
      )}
    </section>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-8">
      <section id="modules" data-animate-section><div className="flex items-center justify-between mb-3"><h2 className="text-base font-semibold">Module health</h2><span className="text-xs text-text-muted">Configuration status</span></div><div className="grid md:grid-cols-2 gap-x-6">{modules.map(([id, name, description, path]) => <Link href={`/dashboard/${guildId}${path}`} className="module-card" key={id}><div><h3 className="font-medium text-sm">{name}</h3><p className="text-xs text-text-muted mt-1">{description}</p></div><div className="flex items-center gap-2"><StatusBadge status={stats?.modules?.[id] == null ? 'Unknown' : stats.modules[id] ? 'Enabled' : 'Disabled'} variant={stats?.modules?.[id] ? 'enabled' : 'neutral'}/><ChevronRight size={14} className="text-text-muted"/></div></Link>)}</div></section>
      <aside className="space-y-5"><h2 className="text-base font-semibold">Quick operations</h2><div className="space-y-1">{[['Welcome designer','/welcome'],['Economy & rewards','/economy'],['Access simulator','/permissions?tab=simulator'],['Audit log','/permissions?tab=audit']].map(([label,path]) => <Link key={path} href={`/dashboard/${guildId}${path}`} className="flex justify-between items-center py-3 text-sm text-text-secondary hover:text-text-primary border-b border-border-subtle">{label}<ArrowUpRight size={14}/></Link>)}</div><div className="text-xs text-text-muted leading-relaxed">Settings and access rules are scoped to <span className="text-text-secondary">{guild?.name}</span>.</div><Link href={`/dashboard/${guildId}/developers`} className="btn-secondary w-full">Inspect runtime</Link></aside>
    </div>
    <section className="surface-container overflow-hidden" data-animate-section><div className="panel-header flex-wrap gap-3"><h2 className="font-semibold">Recent activity</h2><div className="flex items-center gap-3 text-xs text-text-secondary"><span>Follow</span><Toggle checked={follow} onChange={setFollow} label="Follow latest activity"/><button className="btn-ghost px-2" onClick={() => setExpanded(true)} aria-label="Expand activity"><Maximize2 size={14}/></button></div></div><HawkScrollArea ref={logRef} orientation="both" maxHeight="320px" aria-label="Recent server activity">{logContent}</HawkScrollArea><form onSubmit={submitCommand} className="flex items-center gap-3 px-4 py-3 border-t border-border"><Terminal size={15} className="text-text-muted"/><input value={command} onChange={e => setCommand(e.target.value)} aria-label="Activity console command" className="bg-transparent text-xs font-mono flex-1 min-w-0" placeholder="help · refresh · clear · ping · stats"/><button className="btn-ghost" type="submit">Run</button></form></section>
    <AnimatedDrawer isOpen={expanded} onClose={() => setExpanded(false)} title="Recent activity" width="max-w-3xl">{logContent}</AnimatedDrawer>
  </div>;
}

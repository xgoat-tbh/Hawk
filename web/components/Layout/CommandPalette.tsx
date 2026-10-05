'use client';
import { apiFetch } from '@/lib/api';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpRight } from 'lucide-react';
import { AnimatedModal } from '@/components/ui/AnimatedModal';
import { Command as Cmdk } from 'cmdk';
import { useGuildData } from '@/context/GuildContext';
import { useMemberSearch } from '@/hooks/useMemberSearch';
import { navigation } from '@/components/Sidebar';
interface CommandPaletteProps { guildId: string; isOpen: boolean; onClose: () => void; }
interface Result { id: string; label: string; description?: string; path: string; category: string; }
export function CommandPalette({ guildId, isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter(); const { channels, roles, config } = useGuildData();
  const [query,setQuery] = useState('');
  const [commands,setCommands] = useState<{name:string;description:string;category:string}[]>([]);
  const [audit,setAudit] = useState<any[]>([]); const [failure,setFailure] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const members = useMemberSearch(guildId, isOpen ? query : '');
  useEffect(() => {
    if (!isOpen) return;
    setQuery(''); setFailure(null);
    const controller = new AbortController();
    Promise.all([apiFetch('/api/commands',{signal:controller.signal}),apiFetch(`/api/guilds/${guildId}/audit`,{signal:controller.signal})]).then(async ([c,a]) => {
      if (c.ok) setCommands((await c.json()).commands || []); else setFailure('Commands unavailable.');
      if (a.ok) setAudit((await a.json()).logs || []); else setFailure('Audit search unavailable for this account.');
    }).catch(() => { if (!controller.signal.aborted) setFailure('Some resources could not be loaded. Close and reopen to retry.'); });
    const timer = requestAnimationFrame(() => input.current?.focus());
    return () => { controller.abort(); cancelAnimationFrame(timer); };
  },[isOpen,guildId]);
  const base = `/dashboard/${guildId}`;
  const pages: Result[] = navigation.flatMap(g => g.items.map(([label,path]) => ({id:path,label,path:base+path,category:'Pages'})));
  const settings: Result[] = [['Command prefix','/general'],['Bot commander role','/general'],['Server activity channel','/general'],['Welcome message','/welcome'],['Daily rewards','/economy'],['Voice room defaults','/pvc']].map(([label,path]) => ({id:label,label,path:base+path,category:'Settings'}));
  const actions: Result[] = [{id:'simulator',label:'Simulate access',description:'Inspect real permission resolution',path:base+'/permissions?tab=simulator',category:'Actions'}];
  const q = query.trim().toLowerCase();
  const all: Result[] = [...pages,...settings,...actions,
    ...roles.map(r => ({id:r.id,label:r.name,description:r.id,path:`${base}/permissions?tab=simulator&role=${r.id}`,category:'Roles'})),
    ...channels.map(c => ({id:c.id,label:`#${c.name}`,description:c.id,path:base+'/general',category:'Channels'})),
    ...commands.map(c => ({id:c.name,label:`${config?.general?.prefix || '!'}${c.name}`,description:`${c.category} · ${c.description}`,path:`${base}/permissions?tab=commands&command=${encodeURIComponent(c.name)}`,category:'Commands'})),
    ...members.users.map(u => ({id:u.id,label:u.displayName || u.username,description:`${u.username} · ${u.id}`,path:`${base}/permissions?tab=simulator&user=${u.id}`,category:'Users'})),
    ...audit.map(a => ({id:a.id,label:a.action,description:`${a.userName || a.userId} · ${a.module}`,path:`${base}/permissions?tab=audit&entry=${encodeURIComponent(a.id)}`,category:'Recent audit'})),
  ];
  const results = (q ? all.filter(item => `${item.label} ${item.description || ''} ${item.category}`.toLowerCase().includes(q)) : [...pages,...actions]).slice(0,80);
  const pick = (item:Result) => { onClose(); router.push(item.path); };
  return <AnimatedModal isOpen={isOpen} onClose={onClose} title="Search workspace" subtitle="Pages, settings, members, roles, channels, commands, and recent audit entries." maxWidth="max-w-2xl">
    <Cmdk shouldFilter={false} loop>
      <div className="flex gap-3 items-center mb-4"><Search size={18} className="text-text-muted"/><Cmdk.Input ref={input} value={query} onValueChange={setQuery} className="glass-input" aria-label="Search workspace" placeholder="Where would you like to go?"/></div>
      {(failure || members.error) && <p role="status" className="text-warning-text text-xs pb-3">{failure || members.error}</p>}
      <Cmdk.List aria-label="Search results" className="max-h-[50vh] overflow-y-auto">
        <Cmdk.Empty className="hawk-empty">{members.loading ? 'Searching members…' : 'No results. Try another name or keyword.'}</Cmdk.Empty>
        {[...new Set(results.map(item => item.category))].map(category => <Cmdk.Group key={category} heading={category} className="text-xs text-text-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-4 [&_[cmdk-group-heading]]:pb-2">
          {results.filter(item => item.category === category).map(item => <Cmdk.Item key={`${item.category}-${item.id}`} value={`${item.category}-${item.id}`} onSelect={() => pick(item)} className="flex items-center justify-between gap-3 px-3 py-3 rounded-md cursor-pointer data-[selected=true]:bg-surface-4 text-text-primary">
            <div className="min-w-0"><div className="text-sm truncate">{item.label}</div>{item.description && <div className="text-xs text-text-muted truncate mt-1">{item.description}</div>}</div><ArrowUpRight size={14} className="text-text-muted shrink-0"/>
          </Cmdk.Item>)}
        </Cmdk.Group>)}
      </Cmdk.List>
    </Cmdk><div className="text-[11px] text-text-muted border-t border-border mt-4 pt-3">↑↓ Navigate · Enter Open · Esc Close{q && ' · Showing up to 80 matches'}</div>
  </AnimatedModal>;
}

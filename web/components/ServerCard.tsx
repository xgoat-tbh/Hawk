import React from 'react';
import Link from 'next/link';
import { ArrowRight, Server, FlaskConical } from 'lucide-react';
import type { DiscordGuild } from '@/lib/discord';
export function ServerCard({ guild, testServer = false }: { guild: DiscordGuild; testServer?: boolean }) {
 const members = guild.approximateMemberCount ?? guild.memberCount;
 return <article className={`surface-container p-6 sm:p-8 space-y-6 ${testServer ? '' : 'border-accent/50'}`}><div className="flex items-center gap-4">{guild.iconUrl ? <img src={guild.iconUrl} alt="" className="w-14 h-14 rounded-xl"/> : <div className="w-14 h-14 rounded-xl bg-surface-3 grid place-items-center">{testServer ? <FlaskConical size={24}/> : <Server size={24}/>}</div>}<div><p className="text-xs uppercase tracking-wider text-text-muted mb-1">{testServer ? 'Test workspace' : 'Production workspace'}</p><h2 className="text-xl font-semibold">{testServer ? 'Yolo (Test)' : 'Main Server'}</h2><p className="text-sm text-text-secondary mt-1">{guild.name}</p></div></div><p className="text-sm text-text-muted">{members == null ? 'Member count unavailable' : `${members.toLocaleString()} members`}</p><Link href={`/dashboard/${guild.id}`} className={testServer ? 'btn-secondary w-full' : 'btn-primary w-full'}>Open dashboard<ArrowRight size={16} className="ml-2"/></Link></article>;
}

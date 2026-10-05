 'use client';
import { apiFetch } from '@/lib/api';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toggle } from '@/components/ui/Toggle';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { SaveBar } from '@/components/SaveBar';
import { useFormDraft, isConfigEqual } from '@/hooks/useFormDraft';

type Settings = Cooldowns & { min_bet: number; max_bet: number; coinflip_enabled: boolean; mines_enabled: boolean };
type Cooldowns = Record<'coinflip' | 'mines' | 'work' | 'slut' | 'crime' | 'rob', number>;
const fields: { key: keyof Cooldowns; title: string; max: number }[] = [
  { key: 'coinflip', title: 'Coinflip', max: 3600 }, { key: 'mines', title: 'Mines', max: 3600 },
  { key: 'work', title: 'Work', max: 86400 }, { key: 'slut', title: 'Slut', max: 86400 },
  { key: 'crime', title: 'Crime', max: 86400 }, { key: 'rob', title: 'Rob', max: 86400 },
];
export default function GamesDashboardPage() {
  const { guildId } = useParams() as { guildId: string };
  const [initial, setInitial] = useState<Settings | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const load = useCallback(async () => {
    setFailure(null);
    try {
      const res = await apiFetch(`/api/guilds/${guildId}/games/config`);
      if (!res.ok) throw new Error('Unable to load cooldowns. Check your access and retry.');
      const result = await res.json(); setInitial({ ...result.cooldowns, ...result.settings });
    } catch (err) { setFailure(err instanceof Error ? err.message : 'Unable to load cooldowns.'); }
  }, [guildId]);
  useEffect(() => { void load(); }, [load]);
  const form = useFormDraft<Settings>({ autoSaveMs: 1500, initialData: initial, onSave: async draft => {
    for (const field of fields) if (!Number.isInteger(draft[field.key]) || draft[field.key] < 0 || draft[field.key] > field.max) throw new Error(`${field.title}: enter whole seconds between 0 and ${field.max}.`);
    if (!Number.isSafeInteger(draft.min_bet) || !Number.isSafeInteger(draft.max_bet) || draft.min_bet < 1 || draft.max_bet > 1000000000 || draft.min_bet > draft.max_bet) throw new Error('Set whole bet limits with minimum no greater than maximum.');
    const res = await apiFetch(`/api/guilds/${guildId}/games/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (!res.ok) throw new Error((await res.json()).error || 'Unable to save cooldowns.');
    const check = await apiFetch(`/api/guilds/${guildId}/games/config`);
    if (!check.ok) throw new Error('The server accepted the change, but its saved value could not be verified. Retry to check.');
    const result = await check.json(); const saved = { ...result.cooldowns, ...result.settings };
    if (!isConfigEqual(saved, draft)) throw new Error('Some cooldowns were not persisted. Review the server economy configuration before retrying.');
    return saved;
  }});
  return <div className="hawk-page max-w-5xl"><PageHeader guildId={guildId} title="Minigames & cooldowns" description="Set the wait between games and earning commands. Values are in seconds."/>
    {failure ? <div role="alert" className="text-critical-text text-sm">{failure}<button className="btn-secondary ml-3" onClick={load}>Retry</button></div> : !form.draft ? <p role="status">Loading cooldowns…</p> : <section className="settings-section"><h2>Game availability</h2>{(['coinflip','mines'] as const).map(game => <div className="setting-row" key={game}><div><label>{game === 'coinflip' ? 'Coinflip' : 'Mines'}</label><p>Members can play when enabled and permitted.</p></div><Toggle label={`Enable ${game}`} checked={form.draft![`${game}_enabled`]} onChange={value => form.setField(`${game}_enabled`, value)}/></div>)}<h2>Bet limits</h2><div className="grid sm:grid-cols-2 gap-4 py-5">{(['min_bet','max_bet'] as const).map(key => <label key={key} className="text-sm">{key === 'min_bet' ? 'Minimum bet' : 'Maximum bet'}<input className="glass-input mt-2" type="number" min={1} max={1000000000} step={1} value={form.draft![key]} onChange={event => form.setField(key, Number(event.target.value))}/></label>)}</div><h2>Command cooldowns</h2>{fields.map(field => <div className="setting-row" key={field.key}><div><label htmlFor={`cooldown-${field.key}`}>{field.title}</label><p>Wait before using <code>{field.key}</code> again. Zero removes the delay.</p></div><div className="flex items-center gap-3"><RangeSlider id={`cooldown-${field.key}`} label={`${field.title} cooldown`} min={0} max={field.max} step={1} value={form.draft![field.key]} onChange={value => form.setField(field.key, value)}/><span className="text-text-muted text-xs">seconds</span></div></div>)}</section>}
    <SaveBar isDirty={form.isDirty} saveState={form.saveState} error={form.error} onSave={form.save} onReset={form.reset}/>
  </div>;
}

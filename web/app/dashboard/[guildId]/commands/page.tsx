'use client';
import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import * as Tabs from '@radix-ui/react-tabs';
import { apiFetch } from '@/lib/api';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { SaveBar } from '@/components/SaveBar';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Toggle } from '@/components/ui/Toggle';
import { flowToScript, scriptToFlow, type CommandFlow } from '@/lib/commandFlow';
const FlowCanvas = dynamic(() => import('@/components/Commands/FlowCanvas'), { ssr: false, loading: () => <p role="status">Loading canvas…</p> });
const ScriptEditor = dynamic(() => import('@/components/Commands/ScriptEditor'), { ssr: false, loading: () => <p role="status">Loading editor…</p> });
const initialFlow: CommandFlow = { nodes: [{ id: 'trigger', type: 'hawk', position: { x: 0, y: 0 }, data: { action: 'trigger', args: {} } }, { id: 'reply', type: 'hawk', position: { x: 270, y: 0 }, data: { action: 'reply', args: { text: 'Hello {user}' } } }], edges: [{ id: 'e1', source: 'trigger', target: 'reply' }] };
interface CustomCommand { id?: number; name: string; enabled: boolean; cooldown_ms: number; required_roles: string[]; flow_json: CommandFlow; script_text: string }
const blank: CustomCommand = { name: '', enabled: true, cooldown_ms: 1000, required_roles: [], flow_json: initialFlow, script_text: flowToScript(initialFlow) };
export default function CommandsPage() {
  const { guildId, config, channels, roles, userPermissions } = useGuildData(); const toast = useToast();
  const editable = Boolean(userPermissions?.modules.commands?.manage);
  const [commands, setCommands] = useState<CustomCommand[]>([]); const [failure, setFailure] = useState<string | null>(null); const [deleting, setDeleting] = useState<CustomCommand | null>(null);
  const [mode, setMode] = useState('visual'); const [scriptError, setScriptError] = useState<string | null>(null);
  const load = useCallback(async () => { const response = await apiFetch(`/api/guilds/${guildId}/commands`); const data = await response.json(); if (!response.ok) { setFailure(data.error); return; } setCommands(data.commands); setFailure(null); }, [guildId]);
  useEffect(() => { void load().catch(() => setFailure('Unable to load commands')); }, [load]);
  useEffect(() => { if (window.matchMedia('(max-width: 767px)').matches) setMode('script'); }, []);
  const form = useFormDraft<CustomCommand>({ initialData: blank, onSave: async draft => { const response = await apiFetch(`/api/guilds/${guildId}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success('Command saved'); await load(); return data.command; } });
  const current = form.draft || blank;
  const updateFlow = (flow: CommandFlow) => { form.setField('flow_json', flow); form.setField('script_text', flowToScript(flow)); setScriptError(null); };
  const updateScript = (script: string) => { form.setField('script_text', script); try { form.setField('flow_json', scriptToFlow(script)); setScriptError(null); } catch (error) { setScriptError(error instanceof Error ? error.message : 'Invalid script'); } };
  return <div className="space-y-6"><PageHeader guildId={guildId} title="Custom commands" description="Build prefix commands with connected actions or an editable script." actions={<button disabled={!editable || form.isDirty} className="btn-primary" onClick={() => { form.setPersisted(blank); setScriptError(null); }}>New command</button>}/>
    {failure && <div role="alert" className="text-critical-text">{failure}<button className="btn-secondary ml-3" onClick={load}>Retry</button></div>}
    <section className="surface-container p-4"><h2 className="text-sm font-semibold mb-3">Saved commands</h2>{!commands.length && <p className="text-sm text-text-muted">No custom commands yet.</p>}<div className="flex flex-wrap gap-2">{commands.map(c => <button key={c.id} className="btn-secondary" disabled={form.isDirty} onClick={() => { form.setPersisted(c); setScriptError(null); }}>{config?.general?.prefix || '!'}{c.name}<span className="ml-2 text-text-muted">{c.enabled ? 'Enabled' : 'Disabled'}</span></button>)}</div></section>
    <section className="surface-container p-5 space-y-4"><div className="grid sm:grid-cols-3 gap-4"><label className="text-sm">Command name<input className="glass-input mt-2" aria-label="Command name" value={current.name} maxLength={32} onChange={e => form.setField('name', e.target.value)}/></label><label className="text-sm">Cooldown (ms)<input className="glass-input mt-2" aria-label="Command cooldown in milliseconds" type="number" min={1000} max={86400000} value={current.cooldown_ms} onChange={e => form.setField('cooldown_ms', Number(e.target.value))}/></label><div className="flex items-center gap-3"><Toggle checked={current.enabled} onChange={v => form.setField('enabled', v)} label="Enable custom command"/>Enabled{current.id && <button className="btn-outline-danger ml-auto" onClick={() => setDeleting(current)}>Delete</button>}</div></div>
    <label className="block text-sm">Required roles (optional)<select aria-label="Required command roles" multiple value={current.required_roles} className="glass-input mt-2 min-h-24" onChange={e => form.setField('required_roles', Array.from(e.target.selectedOptions, o => o.value))}>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
    <Tabs.Root value={mode} onValueChange={setMode}><Tabs.List className="flex gap-2 border-b border-border pb-3" aria-label="Command editor"><Tabs.Trigger value="visual" className="btn-secondary hidden md:inline-flex">Visual canvas</Tabs.Trigger><Tabs.Trigger value="script" className="btn-secondary">Script editor</Tabs.Trigger></Tabs.List><Tabs.Content value="visual" className="pt-4 hidden md:block"><FlowCanvas flow={current.flow_json} onChange={updateFlow} disabled={!editable}/></Tabs.Content><div className="md:hidden py-3 text-sm"><button className="btn-secondary" onClick={() => setMode('script')}>Open script editor</button></div><Tabs.Content value="script" className="pt-4"><ScriptEditor value={current.script_text} onChange={updateScript} disabled={!editable} references={[...roles, ...channels]}/></Tabs.Content></Tabs.Root>
    {scriptError && <p role="alert" className="text-critical-text text-sm">{scriptError}</p>}<p className="text-xs text-text-muted">Commands use a restricted flow language. Node arguments are JSON data. Mentions are suppressed; role changes require Discord Manage Roles permission and hierarchy checks.</p></section>
    {editable && <SaveBar isDirty={form.isDirty} saveState={form.saveState} error={form.error || scriptError} onSave={() => { if (!scriptError) return form.save(); }} onReset={() => { form.reset(); setScriptError(null); }}/>}<ConfirmModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete custom command" description={`Delete ${deleting?.name}? This removes the command from this server.`} onConfirm={async () => { const res = await apiFetch(`/api/guilds/${guildId}/commands`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleting?.id }) }); if (!res.ok) { toast.error('Could not delete command'); return; } setDeleting(null); form.setPersisted(blank); await load(); toast.success('Command deleted'); }}/>
  </div>;
}

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
import { MultiRolePicker } from '@/components/ui/MultiRolePicker';
import { flowToScript, type CommandFlow } from '@/lib/commandFlow';
import {
  flowToTypeScript,
  flowToJavaScript,
  flowToPython,
  scriptToLanguageFlow,
  type SupportedScriptLanguage,
} from '@/lib/commandScripting';
import { Wand2, Code2, CheckCircle2, AlertTriangle } from 'lucide-react';

const FlowCanvas = dynamic(() => import('@/components/Commands/FlowCanvas'), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-xl border border-border flex items-center justify-center bg-surface-1 text-sm text-text-muted">
      Loading visual canvas…
    </div>
  ),
});

const ScriptEditor = dynamic(() => import('@/components/Commands/ScriptEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] rounded-xl border border-border flex items-center justify-center bg-surface-1 text-sm text-text-muted">
      Loading script editor…
    </div>
  ),
});

const initialFlow: CommandFlow = {
  nodes: [
    { id: 'trigger', type: 'hawk', position: { x: 50, y: 140 }, data: { action: 'trigger', args: {} } },
    { id: 'reply', type: 'hawk', position: { x: 340, y: 140 }, data: { action: 'reply', args: { text: 'Hello {user}' } } },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'reply' },
  ],
};

interface CustomCommand {
  id?: number;
  name: string;
  enabled: boolean;
  cooldown_ms: number;
  required_roles: string[];
  flow_json: CommandFlow;
  script_text: string;
}

const blank: CustomCommand = {
  name: '',
  enabled: true,
  cooldown_ms: 1000,
  required_roles: [],
  flow_json: initialFlow,
  script_text: flowToTypeScript(initialFlow, 'custom'),
};

export default function CommandsPage() {
  const { guildId, config, channels, roles, userPermissions } = useGuildData();
  const toast = useToast();
  const editable = Boolean(userPermissions?.modules.commands?.manage);

  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CustomCommand | null>(null);

  const [mode, setMode] = useState<'visual' | 'script'>('visual');
  const [scriptLang, setScriptLang] = useState<SupportedScriptLanguage>('typescript');
  const [scriptCode, setScriptCode] = useState<string>(blank.script_text);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/guilds/${guildId}/commands`);
      const data = await response.json();
      if (!response.ok) {
        setFailure(data.error);
        return;
      }
      setCommands(data.commands || []);
      setFailure(null);
    } catch {
      setFailure('Unable to load commands');
    }
  }, [guildId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setMode('script');
    }
  }, []);

  const form = useFormDraft<CustomCommand>({
    initialData: blank,
    onSave: async draft => {
      const payload = {
        ...draft,
        // Canonical script for storage uses flow DSL
        script_text: flowToScript(draft.flow_json),
      };
      const response = await apiFetch(`/api/guilds/${guildId}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success('Command saved successfully');
      await load();
      return data.command;
    },
  });

  const current = form.draft || blank;

  // Sync scriptCode when flow changes from visual editor
  const updateFlow = (flow: CommandFlow) => {
    form.setField('flow_json', flow);
    // Update active language script preview
    const generated =
      scriptLang === 'typescript'
        ? flowToTypeScript(flow, current.name || 'custom')
        : scriptLang === 'javascript'
        ? flowToJavaScript(flow, current.name || 'custom')
        : scriptLang === 'python'
        ? flowToPython(flow, current.name || 'custom')
        : flowToScript(flow);

    setScriptCode(generated);
    setScriptError(null);
  };

  // Convert and Load current script into the flow JSON
  const handleConvertAndLoad = () => {
    try {
      const newFlow = scriptToLanguageFlow(scriptCode, scriptLang);
      form.setField('flow_json', newFlow);
      setScriptError(null);
      toast.success(`Converted ${scriptLang.toUpperCase()} script into visual flow!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid script syntax';
      setScriptError(msg);
      toast.error(msg);
    }
  };

  // Language switch handler: auto-convert current flow to the newly selected language
  const handleLanguageChange = (newLang: SupportedScriptLanguage) => {
    setScriptLang(newLang);
    const converted =
      newLang === 'typescript'
        ? flowToTypeScript(current.flow_json, current.name || 'custom')
        : newLang === 'javascript'
        ? flowToJavaScript(current.flow_json, current.name || 'custom')
        : newLang === 'python'
        ? flowToPython(current.flow_json, current.name || 'custom')
        : flowToScript(current.flow_json);

    setScriptCode(converted);
    setScriptError(null);
  };

  // Select a saved command
  const selectCommand = (c: CustomCommand) => {
    form.setPersisted(c);
    const code =
      scriptLang === 'typescript'
        ? flowToTypeScript(c.flow_json, c.name)
        : scriptLang === 'javascript'
        ? flowToJavaScript(c.flow_json, c.name)
        : scriptLang === 'python'
        ? flowToPython(c.flow_json, c.name)
        : flowToScript(c.flow_json);
    setScriptCode(code);
    setScriptError(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        guildId={guildId}
        title="Custom commands"
        description="Build custom bot commands with connected visual actions or code in TypeScript, JavaScript, and Python."
        actions={
          <button
            disabled={!editable || form.isDirty}
            className="btn-primary"
            onClick={() => {
              form.setPersisted(blank);
              setScriptCode(flowToTypeScript(blank.flow_json, 'custom'));
              setScriptError(null);
            }}
          >
            New command
          </button>
        }
      />

      {failure && (
        <div role="alert" className="p-3 rounded-lg bg-critical-soft border border-critical-border text-critical-text text-sm flex items-center justify-between">
          <span>{failure}</span>
          <button className="btn-secondary text-xs" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {/* Saved Commands List */}
      <section className="surface-container p-4 rounded-xl border border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Saved commands ({commands.length})
        </h2>
        {!commands.length ? (
          <p className="text-sm text-text-muted">No custom commands saved yet. Create your first command below.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {commands.map(c => {
              const isSelected = current.id === c.id;
              return (
                <button
                  key={c.id}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/15 text-text-primary'
                      : 'border-border bg-surface-2 hover:bg-surface-3 text-text-secondary'
                  }`}
                  disabled={form.isDirty}
                  onClick={() => selectCommand(c)}
                >
                  <span className="font-mono text-accent mr-1">
                    {config?.general?.prefix || '!'}
                  </span>
                  {c.name}
                  <span
                    className={`ml-2 text-[10px] px-1.5 py-0.2 rounded-full ${
                      c.enabled
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-surface-4 text-text-muted'
                    }`}
                  >
                    {c.enabled ? 'Active' : 'Disabled'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Command Configuration Card */}
      <section className="surface-container p-5 space-y-5 rounded-xl border border-border">
        {/* Core Metadata */}
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <label className="text-sm font-medium">
            Command name
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-2.5 font-mono text-text-muted select-none text-sm">
                {config?.general?.prefix || '!'}
              </span>
              <input
                className="glass-input pl-7 font-mono w-full"
                aria-label="Command name"
                placeholder="greet"
                value={current.name}
                maxLength={32}
                onChange={e =>
                  form.setField(
                    'name',
                    e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                  )
                }
              />
            </div>
          </label>

          <label className="text-sm font-medium">
            Cooldown (ms)
            <input
              className="glass-input mt-1.5 w-full font-mono"
              aria-label="Command cooldown in milliseconds"
              type="number"
              min={1000}
              max={86400000}
              step={500}
              value={current.cooldown_ms}
              onChange={e => form.setField('cooldown_ms', Number(e.target.value))}
            />
          </label>

          <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-1 border border-border h-[42px]">
            <div className="flex items-center gap-2">
              <Toggle
                checked={current.enabled}
                onChange={v => form.setField('enabled', v)}
                label="Enable custom command"
              />
              <span className="text-xs font-medium">
                {current.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {current.id && (
              <button
                type="button"
                className="text-xs text-critical-text hover:underline"
                onClick={() => setDeleting(current)}
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Required Roles with Modern Multi-Select */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Required roles (optional)
          </label>
          <MultiRolePicker
            roles={roles}
            values={current.required_roles || []}
            onChange={roleIds => form.setField('required_roles', roleIds)}
            disabled={!editable}
            placeholder="Select roles required to execute command…"
          />
          <p className="text-[11px] text-text-muted mt-1.5">
            Leave blank if command should be available to everyone in the server.
          </p>
        </div>

        {/* Editor Tabs: Visual Canvas & Multi-Language Script Editor */}
        <Tabs.Root value={mode} onValueChange={v => setMode(v as 'visual' | 'script')}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <Tabs.List className="flex gap-2" aria-label="Command editor">
              <Tabs.Trigger
                value="visual"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'visual'
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface-2 hover:bg-surface-3 text-text-secondary'
                }`}
              >
                Visual canvas
              </Tabs.Trigger>
              <Tabs.Trigger
                value="script"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  mode === 'script'
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface-2 hover:bg-surface-3 text-text-secondary'
                }`}
              >
                <Code2 size={13} />
                Script editor
              </Tabs.Trigger>
            </Tabs.List>

            {/* Language Switcher & Convert Action (Visible on Script mode) */}
            {mode === 'script' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 rounded-lg bg-surface-1 border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('typescript')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-semibold transition-colors ${
                      scriptLang === 'typescript'
                        ? 'bg-accent text-white'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    TS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('javascript')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-semibold transition-colors ${
                      scriptLang === 'javascript'
                        ? 'bg-accent text-white'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    JS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('python')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-semibold transition-colors ${
                      scriptLang === 'python'
                        ? 'bg-accent text-white'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Python
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('flow')}
                    className={`px-2 py-1 rounded font-mono text-[11px] font-semibold transition-colors ${
                      scriptLang === 'flow'
                        ? 'bg-accent text-white'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Flow
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConvertAndLoad}
                  disabled={!editable}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-all"
                  title="Parse and load active script into the visual canvas"
                >
                  <Wand2 size={13} />
                  Convert & Load
                </button>
              </div>
            )}
          </div>

          {/* Visual Canvas Content */}
          <Tabs.Content value="visual" className="pt-4 outline-none">
            <FlowCanvas roles={roles} channels={channels} flow={current.flow_json} onChange={updateFlow} disabled={!editable} />
          </Tabs.Content>

          {/* Multi-Language Script Editor Content */}
          <Tabs.Content value="script" className="pt-4 space-y-3 outline-none">
            <div className="border border-border rounded-xl overflow-hidden shadow-sm">
              <ScriptEditor
                value={scriptCode}
                onChange={val => {
                  setScriptCode(val);
                  setScriptError(null);
                }}
                language={scriptLang}
                disabled={!editable}
                references={[...roles, ...channels]}
              />
            </div>

            {scriptError ? (
              <div
                role="alert"
                className="p-3 rounded-lg bg-critical-soft border border-critical-border text-critical-text text-xs flex items-center gap-2"
              >
                <AlertTriangle size={14} className="shrink-0" />
                <span>{scriptError}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span>
                  Editing in <strong>{scriptLang.toUpperCase()}</strong>. Write code and click{' '}
                  <strong className="text-text-primary">"Convert & Load"</strong> to synchronize with the visual canvas.
                </span>
              </div>
            )}
          </Tabs.Content>
        </Tabs.Root>

        <p className="text-xs text-text-muted leading-relaxed">
          Commands execute securely in the sandboxed runtime. Interpolate variables with{' '}
          <code className="px-1 py-0.5 rounded bg-surface-2 font-mono text-[11px] text-accent">
            {'{user}'}
          </code>
          ,{' '}
          <code className="px-1 py-0.5 rounded bg-surface-2 font-mono text-[11px] text-accent">
            {'{username}'}
          </code>
          ,{' '}
          <code className="px-1 py-0.5 rounded bg-surface-2 font-mono text-[11px] text-accent">
            {'{server}'}
          </code>
          , and{' '}
          <code className="px-1 py-0.5 rounded bg-surface-2 font-mono text-[11px] text-accent">
            {'{args}'}
          </code>
          .
        </p>
      </section>

      {/* Persistent Save Bar: ONLY visible when form.isDirty is true */}
      {editable && (
        <SaveBar
          isDirty={form.isDirty}
          saveState={form.saveState}
          error={form.error || scriptError}
          onSave={() => {
            if (!scriptError) return form.save();
          }}
          onReset={() => {
            form.reset();
            setScriptCode(
              scriptLang === 'typescript'
                ? flowToTypeScript(form.persisted?.flow_json || initialFlow, form.persisted?.name || 'custom')
                : flowToScript(form.persisted?.flow_json || initialFlow)
            );
            setScriptError(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete custom command"
        description={`Delete !${deleting?.name}? This action removes the command from this server permanently.`}
        onConfirm={async () => {
          const res = await apiFetch(`/api/guilds/${guildId}/commands`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: deleting?.id }),
          });
          if (!res.ok) {
            toast.error('Could not delete command');
            return;
          }
          setDeleting(null);
          form.setPersisted(blank);
          setScriptCode(flowToTypeScript(blank.flow_json, 'custom'));
          await load();
          toast.success('Command deleted');
        }}
      />
    </div>
  );
}

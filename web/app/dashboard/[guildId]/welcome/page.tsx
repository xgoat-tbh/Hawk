'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toggle } from '@/components/ui/Toggle';


import { SaveBar } from '@/components/SaveBar';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { DiscordEmbedSimulator } from '@/components/DiscordEmbedSimulator';
import { WelcomeFormState } from '@/components/Welcome/types';
import {
  HeartHandshake,
  Send,
  Copy,
  RotateCcw,
  Check,
  Loader2,
  Sparkles,
  Sliders,
  Code,
  Hash,
  MessageSquare,
  Users,
} from 'lucide-react';

export default function WelcomeGreetingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { guild, bot, channels, config, updateConfigLocally } = useGuildData();

  const [showJson, setShowJson] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeEditor = useRef<{ element: HTMLInputElement | HTMLTextAreaElement; field: 'title' | 'description' | 'footerText' | 'imageUrl' | 'thumbnailUrl' } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const initialData = useMemo<WelcomeFormState>(() => {
    const wConf = config?.welcome?.config || {};
    const wEmb = config?.welcome?.embed || {};

    return {
      enabled: Boolean(wConf.enabled),
      channelId: wConf.channel_id || null,
      isEmbed: wConf.is_embed !== undefined ? Boolean(wConf.is_embed) : true,
      sendAsDm: false,
      title: wEmb.title || 'Welcome to {server}!',
      description:
        wEmb.description ||
        'Hey {user}, welcome to the server! Make sure to read the rules and introduce yourself.',
      color: wEmb.color || '#5865f2',
      thumbnailUrl: wEmb.thumbnail_url || '{user.avatar}',
      imageUrl: wEmb.image_url || '',
      footerText: wEmb.footer_text || 'Member #{server.count}',
    };
  }, [config?.welcome]);

  const {
    draft,
    isDirty,
    saveState,
    error: saveError,
    setField,
    reset,
    save,
  } = useFormDraft<WelcomeFormState>({
    autoSaveMs: 1500, initialData,
    onSave: async (formValues) => {
      if (formValues.enabled && !formValues.channelId) throw new Error('Choose a destination channel before enabling greetings.');
      if (formValues.description.length > (formValues.isEmbed ? 4096 : 2000)) throw new Error('Message exceeds the Discord character limit.');
      if (formValues.title.length > 256 || (formValues.footerText || '').length > 2048) throw new Error('Title or footer exceeds the Discord character limit.');
      if (!/^#[0-9a-f]{6}$/i.test(formValues.color)) throw new Error('Enter a six-digit hex color, for example #8899aa.');
      const payload = {
        config: {
          enabled: formValues.enabled,
          channel_id: formValues.channelId,
        },
        is_embed: formValues.isEmbed,
        embed: {
          title: formValues.title,
          description: formValues.description,
          color: formValues.color,
          thumbnail_url: formValues.thumbnailUrl || null,
          image_url: formValues.imageUrl || null,
          footer_text: formValues.footerText || null,
        },
      };

      const res = await apiFetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'welcome',
          data: payload,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save welcome configuration.');
      }

      const result = await res.json();
      const saved = result.data;
      updateConfigLocally('welcome', { ...saved, config: { ...saved.config, is_embed: saved.is_embed } });
      return { ...formValues, enabled: saved.config.enabled, channelId: saved.config.channel_id, isEmbed: saved.is_embed,
        title: saved.embed.title, description: saved.embed.description, color: saved.embed.color,
        thumbnailUrl: saved.embed.thumbnail_url || '', imageUrl: saved.embed.image_url || '', footerText: saved.embed.footer_text || '' };

    },
  });

  const current = draft || initialData;
  const targetChannel = channels.find((c) => c.id === current.channelId);

  const insertToken = (token: string) => {
    const editor = activeEditor.current;
    const element = editor?.element || textareaRef.current;
    const field = editor?.field || 'description';
    const text = String(current[field] || '');
    const start = element?.selectionStart ?? text.length;
    const end = element?.selectionEnd ?? text.length;
    setField(field, text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => { element?.focus(); element?.setSelectionRange(start + token.length, start + token.length); });
  };

  const handleSendTestMessage = async () => {
    if (!current.channelId) {
      setTestResult({ success: false, message: 'Select a welcome channel first' });
      setTimeout(() => setTestResult(null), 3500);
      return;
    }

    setTestSending(true);
    setTestResult(null);

    try {
      const res = await apiFetch(`/api/guilds/${guildId}/test-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: current.channelId,
          is_embed: current.isEmbed,
          embed: {
            title: current.title,
            description: current.description,
            color: current.color,
            imageUrl: current.imageUrl || null,
            thumbnailUrl: current.thumbnailUrl || null,
            footerText: current.footerText || null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch test greeting.');

      setTestResult({ success: true, message: 'Dispatched test message to Discord!' });
      setTimeout(() => setTestResult(null), 4000);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Dispatch failed.' });
      setTimeout(() => setTestResult(null), 4000);
    } finally {
      setTestSending(false);
    }
  };

  const jsonPayload = useMemo(() => {
    if (!current.isEmbed) return { content: current.description };
    return {
      embeds: [
        {
          title: current.title,
          description: current.description,
          color: parseInt(current.color.replace('#', ''), 16) || 0x5865f2,
          thumbnail: current.thumbnailUrl ? { url: current.thumbnailUrl } : undefined,
          image: current.imageUrl ? { url: current.imageUrl } : undefined,
          footer: current.footerText ? { text: current.footerText } : undefined,
        },
      ],
    };
  }, [current]);

  const handleCopyJson = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2)); setCopiedJson(true); setTimeout(() => setCopiedJson(false), 2500); }
    catch { setTestResult({ success: false, message: 'Clipboard unavailable. Select the JSON text to copy it.' }); }
  };

  const tokenVariables = [
    { label: '{user}', desc: 'Mention member' },
    { label: '{username}', desc: 'Plain username' },
    { label: '{server}', desc: 'Server name' },
    { label: '{server.count}', desc: 'Member count' },
    { label: '{user.avatar}', desc: 'Avatar URL' },
  ];

  const limit = current.isEmbed ? 4096 : 2000;
  const fields = [ ['title', 'Embed title', 256], ['footerText', 'Footer text', 2048], ['thumbnailUrl', 'Thumbnail URL', 2048], ['imageUrl', 'Image URL', 2048] ] as const;
  return <div className="space-y-5">
    <PageHeader guildId={guildId} title="Welcome greetings" description="Create a thoughtful first message for new members. Preview changes as you edit."
      actions={<button className="btn-secondary" onClick={handleSendTestMessage} disabled={testSending || !current.channelId || current.description.length > limit}><Send size={14} className="mr-2"/>{testSending ? 'Sending…' : 'Test in Discord'}</button>}/>
    {testResult && <p role="status" className={`text-sm ${testResult.success ? 'text-success-text' : 'text-critical-text'}`}>{testResult.message}</p>}
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)] gap-8 items-start">
      <div className="min-w-0">
        <section className="hawk-settings-section"><h2>System routing</h2>
          <div className="flex items-center justify-between gap-4 py-4"><div><label className="font-medium">Welcome messages</label><p className="text-xs text-text-secondary mt-1">Greet members when they join this server.</p></div><Toggle label="Enable welcome messages" checked={current.enabled} onChange={v => setField('enabled', v)}/></div>
          <label htmlFor="welcome-channel" className="text-sm block mb-2">Destination channel</label><ChannelPicker id="welcome-channel" label="Destination channel" channels={channels} value={current.channelId} onChange={v => setField('channelId', v)}/>
          {current.enabled && !current.channelId && <p className="text-warning-text text-xs mt-2">Choose a channel to deliver welcome messages.</p>}
        </section>
        <section className="hawk-settings-section"><h2>Message format</h2><div className="flex justify-between gap-4 items-center"><div><span className="text-sm">Rich embed</span><p className="text-xs text-text-secondary mt-1">Add a title, color, images, and footer.</p></div><Toggle label="Use rich embed" checked={current.isEmbed} onChange={v => setField('isEmbed', v)}/></div></section>
        <section className="hawk-settings-section space-y-4"><h2>Message content</h2>
          {current.isEmbed && <div><label htmlFor="welcome-title" className="text-sm block mb-2">Embed title</label><input id="welcome-title" className="glass-input" value={current.title} maxLength={256} onFocus={e => { activeEditor.current = { element: e.currentTarget, field: 'title' }; }} onChange={e => setField('title', e.target.value)}/></div>}
          <div><div className="flex justify-between mb-2"><label htmlFor="welcome-message" className="text-sm">Message body</label><span id="welcome-count" className={`text-xs font-mono ${current.description.length > limit ? 'text-critical-text' : 'text-text-muted'}`}>{current.description.length} / {limit}</span></div>
            <textarea ref={textareaRef} id="welcome-message" rows={7} className="glass-input leading-relaxed" aria-describedby="welcome-count" aria-invalid={current.description.length > limit} value={current.description} onFocus={e => { activeEditor.current = { element: e.currentTarget, field: 'description' }; }} onChange={e => setField('description', e.target.value)}/>
            {current.description.length > limit && <p role="alert" className="text-critical-text text-xs">Shorten the message to fit Discord's character limit.</p>}
          </div>
          <div><h3 className="text-xs text-text-secondary mb-2">Insert a variable into the active field</h3><div className="flex flex-wrap gap-2">{tokenVariables.map(t => <button key={t.label} type="button" onClick={e => {  insertToken(t.label); }} className="btn-secondary font-mono text-xs" title={t.desc}>{t.label}</button>)}</div></div>
        </section>
        {current.isEmbed && <section className="hawk-settings-section space-y-4"><h2>Embed appearance</h2><div><label htmlFor="welcome-color" className="text-sm block mb-2">Accent color</label><div className="flex gap-3"><input aria-label="Choose embed color" type="color" value={/^#[0-9a-f]{6}$/i.test(current.color) ? current.color : '#8899aa'} onChange={e => setField('color', e.target.value)} className="w-10 h-10 bg-transparent"/><input id="welcome-color" value={current.color} onChange={e => setField('color', e.target.value)} className="glass-input font-mono max-w-40"/></div></div>
          {fields.filter(([field]) => field !== 'title').map(([field,label,max]) => <div key={field}><label htmlFor={`welcome-${field}`} className="text-sm block mb-2">{label}</label><input id={`welcome-${field}`} value={current[field] || ''} maxLength={max} className="glass-input" onFocus={e => { activeEditor.current = { element: e.currentTarget, field }; }} onChange={e => setField(field, e.target.value)}/></div>)}
        </section>}
        <section className="py-5"><button className="btn-ghost" onClick={() => setShowJson(!showJson)} aria-expanded={showJson}><Code size={14} className="mr-2"/>Advanced: message payload</button>{showJson && <div className="mt-3 space-y-3"><pre className="p-4 bg-surface-1 rounded-md text-xs overflow-auto max-h-80">{JSON.stringify(jsonPayload, null, 2)}</pre><button className="btn-secondary" onClick={handleCopyJson}>{copiedJson ? 'Copied' : 'Copy JSON'}</button></div>}</section>
      </div>
      <aside className="xl:sticky xl:top-0 space-y-3 min-w-0"><div className="flex justify-between text-xs"><h2 className="font-semibold">Live preview</h2><span className="text-text-muted">Illustrative member</span></div><div ref={previewRef} className="rounded-lg overflow-hidden bg-discord-chat p-4"><DiscordEmbedSimulator isEmbed={current.isEmbed} title={current.title} description={current.description} color={current.color} thumbnailUrl={current.thumbnailUrl === '{user.avatar}' ? null : current.thumbnailUrl} imageUrl={current.imageUrl || null} footerText={current.footerText} serverName={guild?.name} memberCount={guild?.approximateMemberCount ?? guild?.memberCount} botName={bot?.username || 'Hawk'} botAvatarUrl={bot?.avatarUrl}/></div><p className="text-xs text-text-muted leading-relaxed">{targetChannel ? `Delivery channel: #${targetChannel.name}.` : 'Choose a delivery channel.'} Preview updates are local until you save.</p></aside>
    </div>
    <SaveBar isDirty={isDirty} saveState={saveState} error={saveError} onSave={save} onReset={reset}/>
  </div>;
}

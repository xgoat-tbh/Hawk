'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import { useFormDraft } from '@/hooks/useFormDraft';
import { SaveBar } from '@/components/SaveBar';
import { StatCard } from '@/components/ui/StatCard';
import { SystemRoutingSection } from '@/components/Welcome/SystemRoutingSection';
import { MessageFormatSection } from '@/components/Welcome/MessageFormatSection';
import { WelcomePreview } from '@/components/Welcome/WelcomePreview';
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

  const [activeTab, setActiveTab] = useState<'routing' | 'designer' | 'json'>('designer');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    initialData,
    onSave: async (formValues) => {
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

      const res = await fetch(`/api/guilds/${guildId}/config`, {
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

      updateConfigLocally('welcome', payload);
      return formValues;
    },
  });

  const current = draft || initialData;
  const targetChannel = channels.find((c) => c.id === current.channelId);

  const insertToken = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setField('description', current.description + ' ' + token);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = current.description;
    const newText = text.substring(0, start) + token + text.substring(end);

    setField('description', newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
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
      const res = await fetch(`/api/guilds/${guildId}/test-welcome`, {
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

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#f0f2f5] flex items-center gap-2.5">
            <HeartHandshake className="w-5 h-5 text-indigo-400" />
            Welcome Greetings & Embed Designer
          </h1>
          <p className="mt-1 text-xs text-[#8c949e]">
            Craft automated welcome messages dispatched when members join your server.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendTestMessage}
            disabled={testSending || !current.channelId}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14161b] hover:bg-[#1c1f26] border border-[#20242c] text-[#c1c7cd] hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-40"
            title="Dispatch a test greeting to your configured Discord channel"
          >
            {testSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>{testSending ? 'Sending...' : 'Test in Discord'}</span>
          </button>
        </div>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div
          className={`p-3 rounded-xl text-xs border flex items-center justify-between transition-all ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Overview StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Delivery State"
          value={current.enabled ? 'Enabled' : 'Disabled'}
          subtitle="Automated welcome trigger"
          icon={Sparkles}
        />
        <StatCard
          title="Target Channel"
          value={targetChannel ? `#${targetChannel.name}` : 'Not Assigned'}
          subtitle="Public greeting channel"
          icon={Hash}
        />
        <StatCard
          title="Message Format"
          value={current.isEmbed ? 'Rich Embed' : 'Plain Text'}
          subtitle="Card rendering engine"
          icon={MessageSquare}
        />
        <StatCard
          title="Server Scope"
          value={guild?.approximateMemberCount ? `${guild.approximateMemberCount.toLocaleString()}` : `${channels.length} Channels`}
          subtitle="Target audience reach"
          icon={Users}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1d24] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('designer')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'designer'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Message & Embed Designer
        </button>

        <button
          onClick={() => setActiveTab('routing')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'routing'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Routing & Setup
        </button>

        <button
          onClick={() => setActiveTab('json')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'json'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-[#717882] hover:text-[#c1c7cd]'
          }`}
        >
          <Code className="w-4 h-4" />
          Raw JSON Payload
        </button>
      </div>

      {/* TAB 1: Designer */}
      {activeTab === 'designer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
            <MessageFormatSection
              current={current}
              setField={setField}
              textareaRef={textareaRef}
              insertToken={insertToken}
            />

            <div className="pt-3 flex items-center justify-between border-t border-[#1a1d24]">
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14161b] hover:bg-[#1c1f26] border border-[#20242c] text-[#c1c7cd] hover:text-white flex items-center gap-1.5 transition-colors"
              >
                {copiedJson ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#717882]" />
                )}
                <span>{copiedJson ? 'Copied JSON!' : 'Copy Discord JSON'}</span>
              </button>

              <button
                type="button"
                onClick={() => reset()}
                disabled={!isDirty}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14161b] hover:bg-[#1c1f26] border border-[#20242c] text-[#717882] hover:text-[#c1c7cd] flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Draft</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 sticky top-6">
            <WelcomePreview
              current={current}
              guildName={guild?.name}
              botUsername={bot?.username}
              botAvatarUrl={bot?.avatarUrl}
            />
          </div>
        </div>
      )}

      {/* TAB 2: Routing */}
      {activeTab === 'routing' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <SystemRoutingSection
            current={current}
            channels={channels}
            setField={setField}
          />
        </div>
      )}

      {/* TAB 3: Raw JSON */}
      {activeTab === 'json' && (
        <div className="bg-[#0c0d10] border border-[#1a1d24] rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Discord REST JSON Representation</h3>
              <p className="text-xs text-[#8c949e]">Full embed payload sent to Discord Webhook and REST API channels.</p>
            </div>
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14161b] hover:bg-[#1c1f26] border border-[#20242c] text-[#c1c7cd] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedJson ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-[#121418] border border-[#20242c] text-xs font-mono text-[#c1c7cd] overflow-x-auto">
            {JSON.stringify(jsonPayload, null, 2)}
          </pre>
        </div>
      )}

      <SaveBar
        isDirty={isDirty}
        saveState={saveState}
        onSave={save}
        onReset={reset}
        error={saveError}
      />
    </div>
  );
}
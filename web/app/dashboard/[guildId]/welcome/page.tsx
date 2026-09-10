'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useFormDraft } from '@/hooks/useFormDraft';
import { SaveBar } from '@/components/SaveBar';
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
} from 'lucide-react';

export default function WelcomeGreetingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { guild, bot, channels, config, updateConfigLocally, loading } = useGuildData();
  const containerRef = usePageEntrance(!loading);

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

  const handleCopyJson = () => {
    const payload = {
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
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
  };

  return (
    <div ref={containerRef} className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17191c] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#ededed] tracking-tight flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-[#949aa2]" />
            <span>Welcome Greetings & Embed Designer</span>
          </h1>
          <p className="text-xs text-[#6e747c] mt-0.5">
            Craft automated welcome messages dispatched when members join your server.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendTestMessage}
            disabled={testSending || !current.channelId}
            className="btn-outline-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Dispatch a test greeting to your configured Discord channel"
          >
            {testSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#949aa2]" />
            )}
            <span>{testSending ? 'Sending...' : 'Test in Discord'}</span>
          </button>

          <button
            type="button"
            onClick={() => save()}
            disabled={saveState === 'saving' || !isDirty}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
          >
            <span>
              {saveState === 'saving'
                ? 'Saving...'
                : saveState === 'success'
                ? '✓ Saved'
                : 'Save Changes'}
            </span>
          </button>
        </div>
      </div>

      {/* Test Result Toast */}
      {testResult && (
        <div
          className={`p-3 rounded-md text-xs border flex items-center justify-between transition-all ${
            testResult.success
              ? 'bg-success-soft border-success-border text-success-text'
              : 'bg-critical-soft border-critical-border text-critical-text'
          }`}
        >
          <span>{testResult.message}</span>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Configuration Controls */}
        <div className="lg:col-span-7 space-y-6">
          <SystemRoutingSection
            current={current}
            channels={channels}
            setField={setField}
          />

          <MessageFormatSection
            current={current}
            setField={setField}
            textareaRef={textareaRef}
            insertToken={insertToken}
          />

          {/* Utility Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-[#17191c]">
            <button
              type="button"
              onClick={handleCopyJson}
              className="btn-outline-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              {copiedJson ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[#6e747c]" />
              )}
              <span>{copiedJson ? 'Copied JSON!' : 'Copy Discord JSON'}</span>
            </button>

            <button
              type="button"
              onClick={() => reset()}
              disabled={!isDirty}
              className="btn-outline-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-35"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#6e747c]" />
              <span>Reset Draft</span>
            </button>
          </div>
        </div>

        {/* Right Side: Sticky Live Discord Preview */}
        <WelcomePreview
          current={current}
          guildName={guild?.name}
          botUsername={bot?.username}
          botAvatarUrl={bot?.avatarUrl}
        />
      </div>

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
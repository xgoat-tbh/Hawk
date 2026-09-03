'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useGuildData } from '@/context/GuildContext';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useFormDraft } from '@/hooks/useFormDraft';
import { ChannelPicker } from '@/components/ui/ChannelPicker';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SaveBar } from '@/components/SaveBar';
import { DiscordEmbedSimulator } from '@/components/DiscordEmbedSimulator';
import {
  HeartHandshake,
  Send,
  Copy,
  RotateCcw,
  Sparkles,
  Check,
  Loader2,
  AlignLeft,
  Settings2,
} from 'lucide-react';

interface WelcomeFormState {
  enabled: boolean;
  channelId: string | null;
  isEmbed: boolean;
  sendAsDm: boolean;
  title: string;
  description: string;
  color: string;
  thumbnailUrl: string;
  imageUrl: string;
  footerText: string;
}

const COLOR_PRESETS = [
  { name: 'Discord Blurple', hex: '#5865f2' },
  { name: 'Emerald', hex: '#22c55e' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Coral Red', hex: '#ef4444' },
  { name: 'Deep Dark', hex: '#1e1f22' },
  { name: 'Clean White', hex: '#ffffff' },
];

const VARIABLE_TOKENS = [
  { token: '{user}', label: '@Member (Mention)', desc: 'Pings the joining member' },
  { token: '{username}', label: 'Username', desc: 'Display name without @' },
  { token: '{server}', label: 'Server Name', desc: 'Current Discord guild name' },
  { token: '{server.count}', label: 'Member Count', desc: 'Total server member count' },
  { token: '{user.avatar}', label: 'User Avatar URL', desc: 'Joining user avatar image' },
];

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
      isEmbed: true,
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

  // Insert token at cursor position
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

  // Test welcome message push directly to Discord
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

      {/* 2-Column Responsive Layout: Left Config + Right Sticky Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Configuration Controls (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Group 1: System Routing */}
          <div className="space-y-1" data-animate-section>
            <SectionHeader
              title="System Routing"
              description="Configure dispatch destination and activation state."
              icon={<Settings2 className="w-3.5 h-3.5 text-[#6e747c]" />}
            />

            <div className="pt-2">
              <SettingRow
                label="Enable Welcome Greetings"
                description="When enabled, Hawk will automatically post the greeting when a new user arrives."
                badge={current.enabled ? 'Active' : 'Disabled'}
                badgeVariant={current.enabled ? 'success' : 'neutral'}
              >
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.enabled}
                    onChange={(e) => setField('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#121417] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#ededed] after:border-[#1f2226] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success border border-[#1f2226]"></div>
                </label>
              </SettingRow>

              <SettingRow
                label="Target Welcome Channel"
                description="The text channel where welcome messages are dispatched."
                badge="Channel"
              >
                <div className="w-64">
                  <ChannelPicker
                    channels={channels}
                    value={current.channelId}
                    onChange={(val) => setField('channelId', val)}
                    placeholder="Select welcome channel..."
                  />
                </div>
              </SettingRow>

              <SettingRow
                label="Direct Message (DM) Delivery"
                description="Send the greeting directly to the user's private messages in addition to the channel."
                badge="Optional"
              >
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.sendAsDm}
                    onChange={(e) => setField('sendAsDm', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#121417] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#ededed] after:border-[#1f2226] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success border border-[#1f2226]"></div>
                </label>
              </SettingRow>
            </div>
          </div>

          {/* Group 2: Message Format & Content */}
          <div className="space-y-1" data-animate-section>
            <SectionHeader
              title="Message Format & Content"
              description="Customize the text body and visual styling of the greeting."
              icon={<AlignLeft className="w-3.5 h-3.5 text-[#6e747c]" />}
            />

            <div className="pt-2">
              <SettingRow
                label="Message Presentation"
                description="Display as an authentic Discord Rich Embed or standard text message."
              >
                <div className="flex items-center gap-1 bg-[#0a0b0d] p-0.5 rounded-md border border-[#1f2226]">
                  <button
                    type="button"
                    onClick={() => setField('isEmbed', true)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      current.isEmbed
                        ? 'bg-[#17191c] text-[#ededed] shadow-tactile-btn'
                        : 'text-[#6e747c] hover:text-[#ededed]'
                    }`}
                  >
                    Rich Embed
                  </button>
                  <button
                    type="button"
                    onClick={() => setField('isEmbed', false)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      !current.isEmbed
                        ? 'bg-[#17191c] text-[#ededed] shadow-tactile-btn'
                        : 'text-[#6e747c] hover:text-[#ededed]'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>
              </SettingRow>

              {current.isEmbed && (
                <SettingRow
                  label="Embed Title"
                  description="Top title line displayed in bold."
                >
                  <input
                    type="text"
                    value={current.title}
                    maxLength={256}
                    onChange={(e) => setField('title', e.target.value)}
                    className="glass-input text-xs w-64"
                    placeholder="Welcome to {server}!"
                  />
                </SettingRow>
              )}

              {/* Message Textarea with Token Injection */}
              <div className="py-3 border-b border-[#17191c] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-[#ededed]">
                      {current.isEmbed ? 'Embed Description' : 'Message Body'}
                    </span>
                    <p className="text-[11px] text-[#6e747c]">
                      Supports Markdown: **bold**, *italic*, `code`, and variable tokens.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#6e747c]">
                    {current.description.length} / {current.isEmbed ? '4096' : '2000'}
                  </span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={current.description}
                  maxLength={current.isEmbed ? 4096 : 2000}
                  rows={4}
                  onChange={(e) => setField('description', e.target.value)}
                  className="glass-input font-mono text-xs w-full resize-y min-h-[90px]"
                  placeholder="Hey {user}, welcome to {server}! Check out #rules..."
                />

                {/* Variable Tokens Chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#6e747c]">
                    <Sparkles className="w-3 h-3 text-warning" />
                    <span>Click a variable to insert into editor:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLE_TOKENS.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        onClick={() => insertToken(v.token)}
                        title={v.desc}
                        className="px-2 py-1 rounded bg-[#121417] border border-[#1f2226] hover:border-[#2a2d33] hover:bg-[#17191c] active:translate-y-[0.5px] text-[11px] font-mono text-[#ededed] flex items-center gap-1 transition-all"
                      >
                        <span className="text-success">{v.token}</span>
                        <span className="text-[9px] text-[#6e747c]">({v.label})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Embed Visual Customization */}
              {current.isEmbed && (
                <>
                  <SettingRow
                    label="Accent Border Color"
                    description="Left colored strip displayed on the Discord embed card."
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {COLOR_PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => setField('color', p.hex)}
                            title={p.name}
                            className={`w-5 h-5 rounded-full border transition-transform ${
                              current.color.toLowerCase() === p.hex.toLowerCase()
                                ? 'scale-125 border-white ring-1 ring-white/50'
                                : 'border-transparent hover:scale-110'
                            }`}
                            style={{ backgroundColor: p.hex }}
                          />
                        ))}
                      </div>
                      <input
                        type="text"
                        value={current.color}
                        maxLength={7}
                        onChange={(e) => setField('color', e.target.value)}
                        className="glass-input font-mono text-xs w-20 text-center"
                        placeholder="#5865f2"
                      />
                    </div>
                  </SettingRow>

                  <SettingRow
                    label="Thumbnail Image URL"
                    description="Small image on the top right. Use {user.avatar} for member avatar."
                  >
                    <input
                      type="text"
                      value={current.thumbnailUrl}
                      onChange={(e) => setField('thumbnailUrl', e.target.value)}
                      className="glass-input text-xs w-64 font-mono"
                      placeholder="{user.avatar} or https://..."
                    />
                  </SettingRow>

                  <SettingRow
                    label="Large Banner Image URL"
                    description="Wide image banner displayed at the bottom of the embed."
                  >
                    <input
                      type="text"
                      value={current.imageUrl}
                      onChange={(e) => setField('imageUrl', e.target.value)}
                      className="glass-input text-xs w-64 font-mono"
                      placeholder="https://..."
                    />
                  </SettingRow>

                  <SettingRow
                    label="Footer Text"
                    description="Small footer caption at the bottom of the embed."
                  >
                    <input
                      type="text"
                      value={current.footerText}
                      maxLength={2048}
                      onChange={(e) => setField('footerText', e.target.value)}
                      className="glass-input text-xs w-64"
                      placeholder="Member #{server.count}"
                    />
                  </SettingRow>
                </>
              )}
            </div>
          </div>

          {/* Group 3: Utility Actions */}
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

        {/* Right Side: Sticky Live Discord Preview (lg:col-span-5) */}
        <div className="lg:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ededed]">
                Live Discord Preview
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            </div>
            <span className="text-[10px] font-mono text-[#6e747c]">Simulated Output</span>
          </div>

          {/* Simulator Container */}
          <div className="rounded-lg overflow-hidden border border-[#1f2226] shadow-2xl bg-[#313338]">
            <DiscordEmbedSimulator
              isEmbed={current.isEmbed}
              title={current.title}
              description={current.description}
              color={current.color}
              thumbnailUrl={
                current.thumbnailUrl === '{user.avatar}'
                  ? 'https://cdn.discordapp.com/embed/avatars/0.png'
                  : current.thumbnailUrl
              }
              imageUrl={current.imageUrl || null}
              footerText={current.footerText}
              serverName={guild?.name || 'Discord Server'}
              memberCount={1250}
              botName={bot?.username || 'Hawk'}
              botAvatarUrl={bot?.avatarUrl || null}
            />
          </div>

          <p className="text-[10px] text-[#6e747c] px-1 text-center font-mono">
            Preview renders Discord Markdown, custom emojis, and live variable interpolation.
          </p>
        </div>
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
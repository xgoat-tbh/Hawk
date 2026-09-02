'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { EmojiPicker } from '@/components/EmojiPicker';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DiscordEmbedSimulator } from '@/components/DiscordEmbedSimulator';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { Sparkles, Send, Loader2, CheckCircle2, AlertCircle, Layout, Palette } from 'lucide-react';

export default function WelcomeEmbedPage() {
  const { guildId } = useParams() as { guildId: string };
  const containerRef = usePageEntrance();
  const { guild, bot, channels, emojis, config, updateConfigLocally } = useGuildData();

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [isEmbed, setIsEmbed] = useState(true);
  const [title, setTitle] = useState('Welcome to {server}!');
  const [description, setDescription] = useState('Hey {user}, welcome to the server! Make sure to check out the rules.');
  const [color, setColor] = useState('#ffffff');
  const [imageUrl, setImageUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('{user.avatar}');
  const [footerText, setFooterText] = useState('Member #{server.count}');

  // Original State
  const [original, setOriginal] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleSendTest = async () => {
    if (!channelId) {
      setTestError('Please select a welcome channel first.');
      setTimeout(() => setTestError(null), 4000);
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    setTestError(null);

    try {
      const res = await fetch(`/api/guilds/${guildId}/test-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          is_embed: isEmbed,
          embed: {
            title,
            description,
            color,
            image_url: imageUrl || null,
            thumbnail_url: thumbnailUrl || null,
            footer_text: footerText || null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test message');
      setTestStatus('Test welcome message sent cleanly to channel.');
      setTimeout(() => setTestStatus(null), 5000);
    } catch (err: any) {
      setTestError(err.message || 'Failed to dispatch test message.');
      setTimeout(() => setTestError(null), 5000);
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    if (config?.welcome) {
      const cfg = config.welcome.config || {};
      const emb = config.welcome.embed || {};

      setEnabled(Boolean(cfg.enabled));
      setChannelId(cfg.channel_id || null);
      setTitle(emb.title || 'Welcome to {server}!');
      setDescription(emb.description || 'Hey {user}, welcome to the server! Make sure to check out the rules.');
      setColor(emb.color || '#ffffff');
      setImageUrl(emb.image_url || '');
      setThumbnailUrl(emb.thumbnail_url || '{user.avatar}');
      setFooterText(emb.footer_text || 'Member #{server.count}');

      setOriginal({
        enabled: Boolean(cfg.enabled),
        channelId: cfg.channel_id || null,
        isEmbed: true,
        title: emb.title || 'Welcome to {server}!',
        description: emb.description || 'Hey {user}, welcome to the server! Make sure to check out the rules.',
        color: emb.color || '#ffffff',
        imageUrl: emb.image_url || '',
        thumbnailUrl: emb.thumbnail_url || '{user.avatar}',
        footerText: emb.footer_text || 'Member #{server.count}',
      });
    }
  }, [config]);

  const hasChanges =
    original &&
    (enabled !== original.enabled ||
      channelId !== original.channelId ||
      isEmbed !== original.isEmbed ||
      title !== original.title ||
      description !== original.description ||
      color !== original.color ||
      imageUrl !== original.imageUrl ||
      thumbnailUrl !== original.thumbnailUrl ||
      footerText !== original.footerText);

  const handleReset = () => {
    if (!original) return;
    setEnabled(original.enabled);
    setChannelId(original.channelId);
    setIsEmbed(original.isEmbed);
    setTitle(original.title);
    setDescription(original.description);
    setColor(original.color);
    setImageUrl(original.imageUrl);
    setThumbnailUrl(original.thumbnailUrl);
    setFooterText(original.footerText);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        is_embed: isEmbed,
        plain_content: description,
        config: {
          enabled,
          channel_id: channelId,
        },
        embed: {
          title,
          description,
          color,
          image_url: imageUrl || null,
          thumbnail_url: thumbnailUrl || null,
          footer_text: footerText || null,
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      updateConfigLocally('welcome', payload);
      setSaveSuccess(true);
      setOriginal({
        enabled,
        channelId,
        isEmbed,
        title,
        description,
        color,
        imageUrl,
        thumbnailUrl,
        footerText,
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const insertTag = (tag: string) => {
    setDescription((prev) => `${prev} ${tag}`);
  };

  const insertEmoji = (emojiCode: string) => {
    setDescription((prev) => `${prev} ${emojiCode}`);
  };

  const variables = [
    { label: '{user}', desc: 'Mention user' },
    { label: '{username}', desc: 'Username' },
    { label: '{server}', desc: 'Server name' },
    { label: '{server.count}', desc: 'Member count' },
    { label: '{user.avatar}', desc: 'Avatar URL' },
    { label: '{server.icon}', desc: 'Server icon' },
    { label: '{randomuser}', desc: 'Random member' },
  ];

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#a9adb2]" />
            <span>Welcome Greetings & Embed Designer</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
            Configure automated greeting cards and join notifications for new members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendTest}
            disabled={isTesting || !channelId}
            className="btn-outline-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Dispatch clean test message to selected channel"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#a9adb2]" />}
            <span>Send Test</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <span>{isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {testStatus && (
        <div className="p-3 rounded-md bg-success-soft border border-success-border flex items-center gap-2 text-xs text-success-text">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <span>{testStatus}</span>
        </div>
      )}
      {testError && (
        <div className="p-3 rounded-md bg-critical-soft border border-critical-border flex items-center gap-2 text-xs text-critical-text">
          <AlertCircle className="w-4 h-4 text-critical shrink-0" />
          <span>{testError}</span>
        </div>
      )}

      {/* Main 2-Column Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6" data-animate-section>
          {/* Routing & Status Section */}
          <div className="space-y-1">
            <SectionHeader
              title="System Routing & Activation"
              description="Toggle automated greetings and target channel."
              icon={<Layout className="w-4 h-4" />}
            />

            <div className="pt-2">
              <SettingRow
                label="Enable Welcome Messages"
                description="Automatically posts greeting when a new member joins the server."
                badge={enabled ? 'Active' : 'Disabled'}
                badgeVariant={enabled ? 'success' : 'neutral'}
              >
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-[#17191c] border border-[#24272b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#f1f2f3] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success peer-checked:after:bg-black"></div>
                </label>
              </SettingRow>

              <SettingRow
                label="Destination Channel"
                description="Text channel where new member greetings are posted."
              >
                <div className="w-64">
                  <ChannelSelect
                    channels={channels}
                    value={channelId}
                    onChange={setChannelId}
                    placeholder="Select welcome channel..."
                    allowedTypes={[0, 5]}
                  />
                </div>
              </SettingRow>

              <SettingRow
                label="Message Layout Format"
                description="Choose between rich Discord embed or plain markdown message."
              >
                <div className="flex items-center gap-1 bg-[#0a0b0d] p-0.5 rounded-md border border-[#24272b]">
                  <button
                    type="button"
                    onClick={() => setIsEmbed(true)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isEmbed ? 'bg-[#e6e8eb] text-[#0d0e10] shadow-clay-button font-semibold' : 'text-[#7e8389] hover:text-[#f1f2f3]'
                    }`}
                  >
                    Rich Embed
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEmbed(false)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      !isEmbed ? 'bg-[#e6e8eb] text-[#0d0e10] shadow-clay-button font-semibold' : 'text-[#7e8389] hover:text-[#f1f2f3]'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>
              </SettingRow>
            </div>
          </div>

          {/* Content & Design Section */}
          <div className="space-y-4">
            <SectionHeader
              title="Message Content & Styling"
              description="Customize text, variables, colors, and banners."
              icon={<Palette className="w-4 h-4" />}
            />

            {/* Quick Variable Insertion Pills */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
                  Dynamic Variables (Click to Insert)
                </span>
                {emojis.length > 0 && (
                  <EmojiPicker emojis={emojis} onSelectEmoji={insertEmoji} />
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => insertTag(v.label)}
                    title={v.desc}
                    className="px-2 py-1 rounded-sm bg-[#121417] hover:bg-[#17191c] border border-[#24272b] text-[11px] font-mono text-[#a9adb2] hover:text-[#f1f2f3] transition-colors"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Embed Title */}
            {isEmbed && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#7e8389]">
                    Embed Title
                  </label>
                  <span className="text-[10px] font-mono text-[#7e8389]">{title.length}/256</span>
                </div>
                <input
                  type="text"
                  maxLength={256}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Welcome to {server}!"
                  className="glass-input text-xs"
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#7e8389]">
                  {isEmbed ? 'Embed Description' : 'Message Content'}
                </label>
                <span className="text-[10px] font-mono text-[#7e8389]">{description.length}/4096</span>
              </div>
              <textarea
                rows={4}
                maxLength={4096}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hey {user}, welcome to the server! Make sure to check out the rules."
                className="glass-input font-sans text-xs leading-relaxed resize-y"
              />
            </div>

            {/* Embed Extra Styling */}
            {isEmbed && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#7e8389]">
                    Embed Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color.startsWith('#') ? color : '#ffffff'}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-7 h-7 rounded-md bg-transparent border border-[#24272b] cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#ffffff"
                      className="glass-input w-24 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-[#7e8389]">
                      Banner Image URL
                    </label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/banner.png"
                      className="glass-input text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-[#7e8389]">
                      Thumbnail URL / Token
                    </label>
                    <input
                      type="text"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="{user.avatar} or image URL"
                      className="glass-input text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-[#7e8389]">
                      Footer Text
                    </label>
                    <span className="text-[10px] font-mono text-[#7e8389]">{footerText.length}/2048</span>
                  </div>
                  <input
                    type="text"
                    maxLength={2048}
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Member #{server.count}"
                    className="glass-input text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Live Discord Simulator (5 cols) */}
        <div className="lg:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7e8389]">
              Live Discord Preview
            </span>
            <span className="text-[10px] font-mono text-[#7e8389]">
              # {channels.find((c) => c.id === channelId)?.name || 'welcome'}
            </span>
          </div>

          <DiscordEmbedSimulator
            isEmbed={isEmbed}
            title={title}
            description={description}
            color={color}
            imageUrl={imageUrl}
            thumbnailUrl={thumbnailUrl}
            footerText={footerText}
            serverName={guild?.name || 'Discord Server'}
            botName={bot?.name || 'Hawk'}
            botAvatarUrl={bot?.avatarUrl}
          />
        </div>
      </div>

      <SaveBar
        hasChanges={Boolean(hasChanges)}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={handleReset}
        error={saveError}
        success={saveSuccess}
      />
    </div>
  );
}
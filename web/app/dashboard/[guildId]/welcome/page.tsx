'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { EmojiPicker } from '@/components/EmojiPicker';
import { SaveBar } from '@/components/SaveBar';
import { SyncLoader } from '@/components/SyncLoader';
import { DiscordEmbedSimulator } from '@/components/DiscordEmbedSimulator';
import { Sparkles, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function WelcomeEmbedPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [emojis, setEmojis] = useState<any[]>([]);
  const [guildName, setGuildName] = useState('Discord Server');

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
      setTestStatus('Test message sent successfully to channel.');
      setTimeout(() => setTestStatus(null), 5000);
    } catch (err: any) {
      setTestError(err.message || 'Failed to dispatch test message.');
      setTimeout(() => setTestError(null), 5000);
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/guilds/${guildId}`);
        const data = await res.json();
        if (data.guild?.name) setGuildName(data.guild.name);
        setChannels(data.channels || []);
        setEmojis(data.emojis || []);

        if (data.config?.welcome) {
          const cfg = data.config.welcome.config || {};
          const emb = data.config.welcome.embed || {};

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
      } catch (err) {
        console.error('Failed to load welcome config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [guildId]);

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
      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'welcome',
          data: {
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
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

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

  if (loading) {
    return <SyncLoader title="Loading Welcome Settings" subtitle="Fetching channel configurations and embed presets..." />;
  }

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
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/80" />
            <span>Welcome Messages & Embed Designer</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Configure automatic greeting cards and join notifications for new members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSendTest}
            disabled={isTesting || !channelId}
            className="btn-outline-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Dispatch live test message to selected channel"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-white/60" />}
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

      {/* Test Status Notifications */}
      {testStatus && (
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-xs text-white">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{testStatus}</span>
        </div>
      )}
      {testError && (
        <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{testError}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card: Routing & State */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-xs text-white tracking-wide uppercase">
                  Welcome System Status
                </h3>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Send greetings when a member joins the server.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
              </label>
            </div>

            <div className="pt-3 border-t border-white/[0.06] space-y-1.5">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                Destination Channel
              </label>
              <ChannelSelect
                channels={channels}
                value={channelId}
                onChange={setChannelId}
                placeholder="Select a welcome text channel..."
                allowedTypes={[0, 5]}
              />
            </div>
          </div>

          {/* Card: Format & Content */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-xs text-white tracking-wide uppercase">
                Message Layout
              </h3>
              <div className="flex items-center gap-1 bg-[#050507] p-1 rounded-lg border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsEmbed(true)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    isEmbed ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Rich Embed
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmbed(false)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    !isEmbed ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Plain Text
                </button>
              </div>
            </div>

            {/* Quick Variable Insertion Pills */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
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
                    className="px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] text-[11px] font-mono text-white/70 hover:text-white transition-colors"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Embed Title */}
            {isEmbed && (
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                    Embed Title
                  </label>
                  <span className="text-[10px] font-mono text-white/30">{title.length}/256</span>
                </div>
                <input
                  type="text"
                  maxLength={256}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Welcome to {server}!"
                  className="glass-input"
                />
              </div>
            )}

            {/* Message Body / Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                  {isEmbed ? 'Embed Description' : 'Message Content'}
                </label>
                <span className="text-[10px] font-mono text-white/30">{description.length}/4096</span>
              </div>
              <textarea
                rows={4}
                maxLength={4096}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hey {user}, welcome! Check out the rules."
                className="glass-input font-sans leading-relaxed resize-y"
              />
            </div>

            {/* Embed Options */}
            {isEmbed && (
              <div className="space-y-4 pt-2 border-t border-white/[0.06]">
                {/* Embed Color Picker */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                    Embed Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color.startsWith('#') ? color : '#ffffff'}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#ffffff"
                      className="glass-input w-28 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                {/* Banner & Thumbnail Image URLs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-white/50">
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
                    <label className="text-[11px] font-mono uppercase tracking-wider text-white/50">
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

                {/* Footer Text */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                      Footer Text
                    </label>
                    <span className="text-[10px] font-mono text-white/30">{footerText.length}/2048</span>
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

        {/* Right Column: Live Discord Simulator (5 cols) */}
        <div className="lg:col-span-5 sticky top-20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
              Live Discord Preview
            </span>
            <span className="text-[10px] font-mono text-white/30">
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
            serverName={guildName}
          />
        </div>
      </div>

      <SaveBar
        hasChanges={hasChanges}
        isSaving={isSaving}
        onSave={handleSave}
        onReset={handleReset}
        error={saveError}
        success={saveSuccess}
      />
    </div>
  );
}
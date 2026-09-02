'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { EmojiPicker } from '@/components/EmojiPicker';
import { SaveBar } from '@/components/SaveBar';
import { SyncLoader } from '@/components/SyncLoader';
import { DiscordEmbedSimulator } from '@/components/DiscordEmbedSimulator';
import { Sparkles, Eye, Palette, Image as ImageIcon, CheckCircle2, FileText, Layout } from 'lucide-react';

export default function WelcomeEmbedPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [emojis, setEmojis] = useState<any[]>([]);
  const [guildName, setGuildName] = useState('Amo India');

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [isEmbed, setIsEmbed] = useState(true);
  const [title, setTitle] = useState('Welcome to {server}!');
  const [description, setDescription] = useState('Hey {user}, welcome to the server! Make sure to read the rules.');
  const [color, setColor] = useState('#5865F2');
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

  const handleSendTest = async () => {
    if (!channelId) {
      setTestStatus('Please select a welcome channel first.');
      setTimeout(() => setTestStatus(null), 4000);
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
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
      setTestStatus('✓ Test message sent to your Discord channel!');
      setTimeout(() => setTestStatus(null), 5000);
    } catch (err: any) {
      setTestStatus(`Failed: ${err.message}`);
      setTimeout(() => setTestStatus(null), 5000);
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/guilds/${guildId}`);
        const data = await res.json();
        if (data.guild) setGuildName(data.guild.name);
        setChannels(data.channels || []);
        setEmojis(data.emojis || []);

        if (data.config?.welcome) {
          const cfg = data.config.welcome.config || {};
          const emb = data.config.welcome.embed || {};

          setEnabled(Boolean(cfg.enabled));
          setChannelId(cfg.channel_id || null);
          setTitle(emb.title || 'Welcome to {server}!');
          setDescription(emb.description || 'Hey {user}, welcome to the server! Make sure to read the rules.');
          setColor(emb.color || '#5865F2');
          setImageUrl(emb.image_url || '');
          setThumbnailUrl(emb.thumbnail_url || '{user.avatar}');
          setFooterText(emb.footer_text || 'Member #{server.count}');

          setOriginal({
            enabled: Boolean(cfg.enabled),
            channelId: cfg.channel_id || null,
            isEmbed: true,
            title: emb.title || 'Welcome to {server}!',
            description: emb.description || 'Hey {user}, welcome to the server! Make sure to read the rules.',
            color: emb.color || '#5865F2',
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
    return <SyncLoader title="Syncing Welcome Messages" subtitle="Loading live Discord embed configurations and greeting channel routing..." />;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#5865F2]" />
            <span>Welcome Messages & Embed Builder</span>
          </h1>
          <p className="text-xs text-white/50 mt-1 font-medium">
            Design custom greeting cards or plain text messages with live server emojis and visual simulator.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="btn-outline-primary text-xs py-2 px-4 flex items-center gap-2 self-start sm:self-auto disabled:opacity-40"
        >
          <span>{isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Enable Switch & Channel Selection Card */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Enable Welcome Messages</h3>
                <p className="text-xs text-white/40">Automatically greet new members when they join.</p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865F2]"></div>
              </label>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Welcome Channel</label>
              <ChannelSelect
                channels={channels}
                value={channelId}
                onChange={setChannelId}
                placeholder="Select welcome channel..."
                allowedTypes={[0, 5]}
              />
            </div>
          </div>

          {/* Message Format Mode Switcher Card */}
          <div className="glass-card p-6 space-y-6">
            <div>
              <h3 className="font-bold text-sm text-white uppercase tracking-wide">Message Format Mode</h3>
              <p className="text-xs text-white/40">Choose between a Discord Rich Embed card or pure Plain Text.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsEmbed(true)}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all ${
                  isEmbed
                    ? 'bg-[#5865F2]/20 border-[#5865F2] text-white shadow-lg'
                    : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Layout className="w-4 h-4 text-[#7289da]" />
                <span>Rich Embed Card</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEmbed(false)}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all ${
                  !isEmbed
                    ? 'bg-[#5865F2]/20 border-[#5865F2] text-white shadow-lg'
                    : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Plain Text (No Embed)</span>
              </button>
            </div>
          </div>

          {/* Content Configuration Card */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="font-bold text-sm text-white uppercase tracking-wide">
              {isEmbed ? 'Embed Card Configuration' : 'Plain Text Message Content'}
            </h3>

            {isEmbed && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Embed Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Welcome to {server}!"
                  className="glass-input text-xs font-semibold"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                  {isEmbed ? 'Embed Description' : 'Message Text'}
                </label>

                {/* Tags & Emoji Picker */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <EmojiPicker emojis={emojis} onSelectEmoji={insertEmoji} />
                  <button
                    type="button"
                    onClick={() => insertTag('{usermention}')}
                    className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-white/70 hover:text-white transition-colors"
                  >
                    + @user
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{servername}')}
                    className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-white/70 hover:text-white transition-colors"
                  >
                    + server
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{servermember}')}
                    className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-white/70 hover:text-white transition-colors"
                  >
                    + count
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hey {usermention}, welcome to {servername}!"
                className="glass-input text-xs leading-relaxed"
              />
            </div>

            {isEmbed && (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Accent Left Border Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-9 h-9 rounded-xl bg-transparent cursor-pointer border border-white/10 p-0.5"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="glass-input max-w-[140px] font-mono uppercase text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Image Banner URL (Optional)</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/banner.gif"
                    className="glass-input text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Thumbnail URL</label>
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="{user.avatar} or image URL"
                    className="glass-input text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Footer Text</label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Member #{server.count}"
                    className="glass-input text-xs font-medium"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Live Discord Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#5865F2]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live Discord Preview</span>
            </div>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={isTesting || !channelId}
              className="btn-outline-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-30"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{isTesting ? 'Sending...' : 'Send Test Message'}</span>
            </button>
          </div>

          {testStatus && (
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{testStatus}</span>
            </div>
          )}

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
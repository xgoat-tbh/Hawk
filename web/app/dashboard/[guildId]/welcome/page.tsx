'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { SaveBar } from '@/components/SaveBar';
import { DiscordEmbedSimulator } from '@/components/DiscordEmbedSimulator';
import { Sparkles, Eye, Palette, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

export default function WelcomeEmbedPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [guildName, setGuildName] = useState('Hawk Community');

  // Form State
  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
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
        if (data.config?.welcome) {
          const cfg = data.config.welcome.config || {};
          const emb = data.config.welcome.embed || {};

          setEnabled(Boolean(cfg.enabled));
          setChannelId(cfg.channel_id || null);
          setTitle(emb.title || 'Welcome to {server}!');
          setDescription(emb.description || 'Hey {user}, welcome! Check out the rules.');
          setColor(emb.color || '#5865F2');
          setImageUrl(emb.image_url || '');
          setThumbnailUrl(emb.thumbnail_url || '{user.avatar}');
          setFooterText(emb.footer_text || 'Member #{server.count}');

          setOriginal({
            enabled: Boolean(cfg.enabled),
            channelId: cfg.channel_id || null,
            title: emb.title || 'Welcome to {server}!',
            description: emb.description || 'Hey {user}, welcome! Check out the rules.',
            color: emb.color || '#5865F2',
            imageUrl: emb.image_url || '',
            thumbnailUrl: emb.thumbnail_url || '{user.avatar}',
            footerText: emb.footer_text || 'Member #{server.count}',
          });
        }
        setChannels(data.channels || []);
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

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

      setOriginal({
        enabled,
        channelId,
        title,
        description,
        color,
        imageUrl,
        thumbnailUrl,
        footerText,
      });
      setSaveSuccess(true);
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

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-surface rounded-xl w-48" />
        <div className="h-40 bg-surface rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-[#5865F2]" />
          <span>Welcome Messages & Embed Builder</span>
        </h1>
        <p className="text-xs text-muted mt-1 font-medium">
          Design custom greeting cards with our live visual Discord simulator.
        </p>
      </div>

      {/* Main Grid: Form on Left, Simulator on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Editor Form */}
        <div className="space-y-6">
          {/* Toggle & Channel */}
          <div className="box-card p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">Enable Welcome Messages</h3>
                <p className="text-xs text-muted">Automatically send a greeting card when new members join.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-[#14171f] border border-[#232733] peer-focus:outline-none rounded-lg peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865F2] peer-checked:border-[#5865F2]" />
              </label>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Welcome Channel</label>
              <ChannelSelect
                channels={channels}
                value={channelId}
                onChange={setChannelId}
                placeholder="Select welcome channel..."
              />
            </div>
          </div>

          {/* Embed Fields */}
          <div className="box-card p-6 space-y-5">
            <h3 className="font-bold text-sm text-white uppercase tracking-wide">Embed Card Configuration</h3>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Embed Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="box-input font-bold"
                placeholder="Welcome to {server}!"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Embed Description</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => insertTag('{user}')}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#14171f] border border-[#232733] text-[#5865F2] hover:bg-[#5865F2] hover:text-white font-bold transition-colors"
                  >
                    + {"{user}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{server}')}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#14171f] border border-[#232733] text-[#5865F2] hover:bg-[#5865F2] hover:text-white font-bold transition-colors"
                  >
                    + {"{server}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag('{server.count}')}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#14171f] border border-[#232733] text-[#5865F2] hover:bg-[#5865F2] hover:text-white font-bold transition-colors"
                  >
                    + {"{server.count}"}
                  </button>
                </div>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="box-input resize-none"
                placeholder="Message body..."
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="box-input w-28 uppercase font-mono text-xs font-bold"
                />
              </div>
            </div>

            {/* Image Banner URL */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Banner Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="box-input"
                placeholder="https://imgur.com/banner.png"
              />
            </div>

            {/* Footer Text */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">Footer Text</label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="box-input"
                placeholder="Member #{server.count}"
              />
            </div>
          </div>
        </div>

        {/* Live Simulator Preview */}
        <div className="space-y-4 sticky top-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted">
              <Eye className="w-4 h-4 text-[#5865F2]" />
              <span>Live Discord Preview</span>
            </div>
            <button
              type="button"
              disabled={isTesting || !channelId}
              onClick={handleSendTest}
              className="btn-outline-primary text-xs py-1.5 px-3 flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Sending...' : 'Send Test Message'}</span>
            </button>
          </div>

          {testStatus && (
            <div
              className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                testStatus.startsWith('✓')
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {testStatus}
            </div>
          )}

          <div className="p-1 rounded-2xl bg-gradient-to-b from-[#1f222a] to-transparent shadow-2xl">
            <DiscordEmbedSimulator
              title={title}
              description={description}
              color={color}
              imageUrl={imageUrl || null}
              thumbnailUrl={thumbnailUrl || null}
              footerText={footerText}
              serverName={guildName}
              memberCount={1250}
            />
          </div>
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

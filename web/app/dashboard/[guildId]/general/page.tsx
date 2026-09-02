'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { RoleSelect } from '@/components/RoleSelect';
import { SaveBar } from '@/components/SaveBar';
import { Sliders, Shield, Terminal, FileText } from 'lucide-react';

export default function GeneralSettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Form State
  const [prefix, setPrefix] = useState('!');
  const [logChannelId, setLogChannelId] = useState<string | null>(null);
  const [auditChannelId, setAuditChannelId] = useState<string | null>(null);
  const [botCommanderRoleId, setBotCommanderRoleId] = useState<string | null>(null);

  // Original State for tracking changes
  const [original, setOriginal] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/guilds/${guildId}`);
        const data = await res.json();
        if (data.config?.general) {
          const gen = data.config.general;
          setPrefix(gen.prefix || '!');
          setLogChannelId(gen.log_channel_id || null);
          setAuditChannelId(gen.audit_channel_id || null);
          setBotCommanderRoleId(gen.bot_commander_role_id || null);

          setOriginal({
            prefix: gen.prefix || '!',
            logChannelId: gen.log_channel_id || null,
            auditChannelId: gen.audit_channel_id || null,
            botCommanderRoleId: gen.bot_commander_role_id || null,
          });
        }
        setChannels(data.channels || []);
        setRoles(data.roles || []);
      } catch (err) {
        console.error('Failed to load general config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [guildId]);

  const hasChanges =
    original &&
    (prefix !== original.prefix ||
      logChannelId !== original.logChannelId ||
      auditChannelId !== original.auditChannelId ||
      botCommanderRoleId !== original.botCommanderRoleId);

  const handleReset = () => {
    if (!original) return;
    setPrefix(original.prefix);
    setLogChannelId(original.logChannelId);
    setAuditChannelId(original.auditChannelId);
    setBotCommanderRoleId(original.botCommanderRoleId);
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
          module: 'general',
          data: {
            prefix,
            log_channel_id: logChannelId,
            audit_channel_id: auditChannelId,
            bot_commander_role_id: botCommanderRoleId,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

      setOriginal({
        prefix,
        logChannelId,
        auditChannelId,
        botCommanderRoleId,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-surface rounded-xl w-48" />
        <div className="h-32 bg-surface rounded-3xl" />
        <div className="h-32 bg-surface rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-accent" />
          <span>General Settings</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Configure core bot prefixes, administrative permissions, and server logging channels.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Command Prefix */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Command Prefix</h3>
              <p className="text-xs text-muted">The character used before all bot commands (e.g. !help, !bal).</p>
            </div>
          </div>
          <div className="max-w-xs">
            <input
              type="text"
              value={prefix}
              maxLength={5}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-white font-mono text-base focus:outline-none focus:border-accent"
              placeholder="!"
            />
          </div>
        </div>

        {/* Bot Commander Role */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Bot Commander Role</h3>
              <p className="text-xs text-muted">Members with this role can execute administrative bot commands.</p>
            </div>
          </div>
          <div className="max-w-md">
            <RoleSelect
              roles={roles}
              value={botCommanderRoleId}
              onChange={setBotCommanderRoleId}
              placeholder="Select commander role..."
            />
          </div>
        </div>

        {/* Logging Channels */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Audit & Event Logging Channels</h3>
              <p className="text-xs text-muted">Direct bot notifications, moderation events, and economy logs.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Server Log Channel</label>
              <ChannelSelect
                channels={channels}
                value={logChannelId}
                onChange={setLogChannelId}
                placeholder="Select log channel..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">Economy Audit Channel</label>
              <ChannelSelect
                channels={channels}
                value={auditChannelId}
                onChange={setAuditChannelId}
                placeholder="Select audit channel..."
              />
            </div>
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

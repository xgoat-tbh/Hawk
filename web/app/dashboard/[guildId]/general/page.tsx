'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { RoleSelect } from '@/components/RoleSelect';
import { SaveBar } from '@/components/SaveBar';
import { useGuildData } from '@/context/GuildContext';
import { Sliders, Shield, Terminal, FileText } from 'lucide-react';

export default function GeneralSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const { channels, roles, config, updateConfigLocally } = useGuildData();

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
    if (config?.general) {
      const gen = config.general;
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
  }, [config]);

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
      const payload = {
        prefix,
        log_channel_id: logChannelId,
        audit_channel_id: auditChannelId,
        bot_commander_role_id: botCommanderRoleId,
      };

      const res = await fetch(`/api/guilds/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'general',
          data: payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }

      updateConfigLocally('general', payload);
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

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-4 h-4 text-white/80" />
            <span>General Settings</span>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Configure bot command prefix, administrator authority role, and server audit logging channels.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{isSaving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* Command Prefix */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Command Prefix</h3>
              <p className="text-[11px] text-white/40">The symbol used before bot commands (e.g. !help, !bal, !pvc).</p>
            </div>
          </div>
          <div className="max-w-xs pt-1">
            <input
              type="text"
              value={prefix}
              maxLength={5}
              onChange={(e) => setPrefix(e.target.value)}
              className="glass-input font-mono text-sm"
              placeholder="!"
            />
          </div>
        </div>

        {/* Bot Commander Role */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Bot Commander Role</h3>
              <p className="text-[11px] text-white/40">Members holding this role receive elevated bot moderation and management authority.</p>
            </div>
          </div>
          <div className="max-w-md pt-1">
            <RoleSelect
              roles={roles}
              value={botCommanderRoleId}
              onChange={setBotCommanderRoleId}
              placeholder="Select commander role..."
            />
          </div>
        </div>

        {/* Logging Channels */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-xs text-white uppercase tracking-wider">Audit & Event Logging Channels</h3>
              <p className="text-[11px] text-white/40">Routing channels for bot events, moderation actions, and economy transactions.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Server Log Channel</label>
              <ChannelSelect
                channels={channels}
                value={logChannelId}
                onChange={setLogChannelId}
                placeholder="Select log channel..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Economy Audit Channel</label>
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

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { RoleSelect } from '@/components/RoleSelect';
import { SaveBar } from '@/components/SaveBar';
import { SettingRow } from '@/components/ui/SettingRow';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { usePageEntrance } from '@/hooks/useAnimation';
import { useGuildData } from '@/context/GuildContext';
import { Sliders, Terminal, FileText } from 'lucide-react';

export default function GeneralSettingsPage() {
  const { guildId } = useParams() as { guildId: string };
  const containerRef = usePageEntrance();
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
    <div ref={containerRef} className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c1f23] pb-4">
        <div>
          <h1 className="text-base font-semibold text-[#f1f2f3] tracking-tight flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#a9adb2]" />
            <span>General Server Settings</span>
          </h1>
          <p className="text-xs text-[#7e8389] mt-0.5">
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

      <div className="space-y-8">
        {/* Core Settings Section */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Core Bot Configuration"
            description="Fundamental prefix and elevated role settings."
            icon={<Terminal className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Command Prefix"
              description="The prefix symbol required before executing text commands in channels."
              badge="Prefix"
            >
              <input
                type="text"
                value={prefix}
                maxLength={5}
                onChange={(e) => setPrefix(e.target.value)}
                className="glass-input font-mono text-xs w-28 text-center"
                placeholder="!"
              />
            </SettingRow>

            <SettingRow
              label="Bot Commander Role"
              description="Members holding this role receive elevated moderation authority and bypass standard command checks."
              badge="Elevated"
              badgeVariant="warning"
            >
              <div className="w-64">
                <RoleSelect
                  roles={roles}
                  value={botCommanderRoleId}
                  onChange={setBotCommanderRoleId}
                  placeholder="Select commander role..."
                />
              </div>
            </SettingRow>
          </div>
        </div>

        {/* Logging Channels Section */}
        <div className="space-y-1" data-animate-section>
          <SectionHeader
            title="Audit & Activity Logging"
            description="Routing channels for moderation events and economy transaction logs."
            icon={<FileText className="w-4 h-4" />}
          />

          <div className="pt-2">
            <SettingRow
              label="Server Moderation Log"
              description="Receives message purge notifications, kick/ban audit logs, and timeout reports."
            >
              <div className="w-64">
                <ChannelSelect
                  channels={channels}
                  value={logChannelId}
                  onChange={setLogChannelId}
                  placeholder="Select log channel..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>

            <SettingRow
              label="Economy Transaction Log"
              description="Receives salary disbursements, shop purchase audits, and currency transfer receipts."
            >
              <div className="w-64">
                <ChannelSelect
                  channels={channels}
                  value={auditChannelId}
                  onChange={setAuditChannelId}
                  placeholder="Select economy log..."
                  allowedTypes={[0, 5]}
                />
              </div>
            </SettingRow>
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

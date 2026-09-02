'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ChannelSelect } from '@/components/ChannelSelect';
import { RoleSelect } from '@/components/RoleSelect';
import { Gamepad2, Info } from 'lucide-react';

export default function GamingSettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [vconfigs, setVconfigs] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/guilds/${guildId}`);
        const data = await res.json();
        setVconfigs(data.config?.vconfigs || []);
        setChannels(data.channels || []);
        setRoles(data.roles || []);
      } catch (err) {
        console.error('Failed to load gaming config:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [guildId]);

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
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Gamepad2 className="w-6 h-6 text-accent" />
          <span>Gaming Voice LFG Notifications</span>
        </h1>
        <p className="text-sm text-muted mt-1">
          Automatically alert gamer roles in text channels when members hop into dedicated gaming voice channels.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-3xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Configured Gaming Voice Triggers</h3>
            <p className="text-xs text-muted">Active voice channels mapped to game roles and alert channels.</p>
          </div>
        </div>

        {vconfigs.length === 0 ? (
          <div className="text-center py-12 bg-background/50 rounded-2xl border border-border">
            <Info className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">No gaming triggers configured yet.</p>
            <p className="text-xs text-muted mt-1">You can configure them in Discord using <code className="text-accent">!vconfig set &lt;voice&gt; &lt;role&gt; &lt;channel&gt;</code>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {vconfigs.map((v, i) => (
              <div key={i} className="bg-background border border-border rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-accent">Trigger #{i + 1}</span>
                  <span className="text-sm text-white">Voice: <span className="font-mono text-muted">{v.channel_id}</span></span>
                  <span className="text-sm text-white">Role: <span className="font-mono text-muted">{v.role_id}</span></span>
                  <span className="text-sm text-white">Alert: <span className="font-mono text-muted">{v.target_channel_id}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

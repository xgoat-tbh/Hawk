'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Gamepad2, Info } from 'lucide-react';

export default function GamingSettingsPage() {
  const { guildId } = useParams() as { guildId: string };

  const [loading, setLoading] = useState(true);
  const [vconfigs, setVconfigs] = useState<any[]>([]);


  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/guilds/${guildId}`);
        const data = await res.json();
        setVconfigs(data.config?.vconfigs || []);
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
        <h1 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <Gamepad2 className="w-6 h-6 text-[#5865F2]" />
          <span>Gaming Voice LFG Notifications</span>
        </h1>
        <p className="text-xs text-white/50 mt-1 font-medium">
          Automatically alert gamer roles in text channels when members hop into dedicated gaming voice channels.
        </p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white uppercase tracking-wide">Configured Gaming Voice Triggers</h3>
            <p className="text-xs text-white/40">Active voice channels mapped to game roles and alert channels.</p>
          </div>
        </div>

        {vconfigs.length === 0 ? (
          <div className="text-center py-12 bg-[#000000]/40 rounded-xl border border-white/[0.06]">
            <Info className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/50">No gaming triggers configured yet.</p>
            <p className="text-xs text-white/30 mt-1">You can configure them in Discord using <code className="text-[#5865F2] font-mono">!vconfig set &lt;voice&gt; &lt;role&gt; &lt;channel&gt;</code>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {vconfigs.map((v, i) => (
              <div key={i} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-[#5865F2]">Trigger #{i + 1}</span>
                  <span className="text-white">Voice: <span className="font-mono text-white/50">{v.channel_id}</span></span>
                  <span className="text-white">Role: <span className="font-mono text-white/50">{v.role_id}</span></span>
                  <span className="text-white">Alert: <span className="font-mono text-white/50">{v.target_channel_id}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


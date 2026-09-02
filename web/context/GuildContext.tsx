'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { DiscordChannel, DiscordRole, DiscordEmoji, DiscordGuild } from '@/lib/discord';

interface BotProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  username: string;
}

interface GuildContextValue {
  guildId: string;
  guild: DiscordGuild | null;
  bot: BotProfile | null;
  channels: DiscordChannel[];
  roles: DiscordRole[];
  emojis: DiscordEmoji[];
  config: any;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateConfigLocally: (moduleName: string, data: any) => void;
}

const GuildContext = createContext<GuildContextValue | null>(null);

export function useGuildData() {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuildData must be used within a GuildProvider');
  }
  return context;
}

interface GuildProviderProps {
  guildId: string;
  initialGuildName?: string;
  initialGuildIcon?: string | null;
  children: React.ReactNode;
}

export function GuildProvider({
  guildId,
  initialGuildName,
  initialGuildIcon,
  children,
}: GuildProviderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guild, setGuild] = useState<DiscordGuild | null>(
    initialGuildName
      ? {
          id: guildId,
          name: initialGuildName,
          icon: null,
          owner: false,
          iconUrl: initialGuildIcon || null,
        }
      : null
  );
  const [bot, setBot] = useState<BotProfile | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [emojis, setEmojis] = useState<DiscordEmoji[]>([]);
  const [config, setConfig] = useState<any>({});
  const [loadingStep, setLoadingStep] = useState(1);

  const fetchGuildBundle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingStep(1);

    const stepTimer = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 280);

    try {
      const res = await fetch(`/api/guilds/${guildId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}: Failed to load server data.`);
      }

      const data = await res.json();
      if (data.guild) setGuild(data.guild);
      if (data.bot) setBot(data.bot);
      if (data.channels) setChannels(data.channels);
      if (data.roles) setRoles(data.roles);
      if (data.emojis) setEmojis(data.emojis);
      if (data.config) setConfig(data.config);
    } catch (err: any) {
      console.error('Failed to fetch guild bundle:', err);
      setError(err.message || 'Error loading server data.');
    } finally {
      clearInterval(stepTimer);
      // Brief pause to allow sleek transition
      setTimeout(() => {
        setLoading(false);
      }, 150);
    }
  }, [guildId]);

  useEffect(() => {
    fetchGuildBundle();
  }, [fetchGuildBundle]);

  const updateConfigLocally = useCallback((moduleName: string, data: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [moduleName]: data,
    }));
  }, []);

  return (
    <GuildContext.Provider
      value={{
        guildId,
        guild,
        bot,
        channels,
        roles,
        emojis,
        config,
        loading,
        error,
        refreshData: fetchGuildBundle,
        updateConfigLocally,
      }}
    >
      {loading ? (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200">
          <div className="max-w-md w-full glass-card p-8 flex flex-col items-center text-center space-y-6">
            {/* Server Icon or Bot Icon */}
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center relative overflow-hidden shadow-2xl">
              {guild?.iconUrl ? (
                <img
                  src={guild.iconUrl}
                  alt={guild.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-base font-bold text-white font-mono">
                  {initialGuildName ? initialGuildName.slice(0, 2).toUpperCase() : 'HK'}
                </span>
              )}
              <div className="absolute inset-0 border border-white/20 rounded-2xl animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-white tracking-tight">
                {guild?.name || initialGuildName || 'Discord Server'}
              </h2>
              <p className="text-xs text-white/40">
                Synchronizing live configuration modules & Discord API state...
              </p>
            </div>

            {/* Stepped Progress Indicator */}
            <div className="w-full space-y-3 pt-2">
              <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300 rounded-full"
                  style={{ width: `${loadingStep * 33.3}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
                <span className={loadingStep >= 1 ? 'text-white font-medium' : ''}>
                  1. Server Info
                </span>
                <span className={loadingStep >= 2 ? 'text-white font-medium' : ''}>
                  2. Channels & Roles
                </span>
                <span className={loadingStep >= 3 ? 'text-white font-medium' : ''}>
                  3. Modules
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </GuildContext.Provider>
  );
}

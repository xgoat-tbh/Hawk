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
  isOwner: boolean;
  userPermissions: {
    isOwner: boolean;
    isAdmin: boolean;
    modules: Record<string, { view: boolean; manage: boolean }>;
  } | null;
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
  const [isOwner, setIsOwner] = useState(false);
  const [userPermissions, setUserPermissions] = useState<{
    isOwner: boolean;
    isAdmin: boolean;
    modules: Record<string, { view: boolean; manage: boolean }>;
  } | null>(null);
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
      setIsOwner(Boolean(data.isOwner));
      if (data.userPermissions) setUserPermissions(data.userPermissions);
    } catch (err: any) {
      console.error('Failed to fetch guild bundle:', err);
      setError(err.message || 'Error loading server data.');
    } finally {
      clearInterval(stepTimer);
      // Complete 360 circuit upon data resolution
      setLoadingStep(4);
      setTimeout(() => {
        setLoading(false);
      }, 350);
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

  const progressPercent =
    loadingStep === 1 ? 30 : loadingStep === 2 ? 65 : loadingStep === 3 ? 90 : 100;

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
        isOwner,
        userPermissions,
        loading,
        error,
        refreshData: fetchGuildBundle,
        updateConfigLocally,
      }}
    >
      {loading ? (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200">
          <div className="max-w-xs w-full flex flex-col items-center text-center space-y-5">
            {/* Full-Bleed Square Logo with Perimeter Loading Bar */}
            <div className="relative w-[72px] h-[72px] shadow-2xl flex items-center justify-center">
              {/* Logo completely fills the square: sharp edges, no padding, no empty space */}
              <div className="w-full h-full overflow-hidden bg-white/[0.04]">
                {guild?.iconUrl ? (
                  <img
                    src={guild.iconUrl}
                    alt={guild.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-lg font-bold text-white font-mono">
                      {initialGuildName ? initialGuildName.slice(0, 2).toUpperCase() : 'HK'}
                    </span>
                  </div>
                )}
              </div>

              {/* SVG 360 Sharp Square Edge Loader running directly on the perimeter */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 72 72"
                fill="none"
              >
                {/* Background track along the square frame edge */}
                <path
                  d="M 36 1 L 71 1 L 71 71 L 1 71 L 1 1 Z"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="2"
                  strokeLinejoin="miter"
                />
                {/* Animated 360° Loading Stroke along the square frame */}
                <path
                  d="M 36 1 L 71 1 L 71 71 L 1 71 L 1 1 Z"
                  stroke="#ededed"
                  strokeWidth="2.5"
                  strokeLinejoin="miter"
                  pathLength={100}
                  strokeDasharray="100"
                  strokeDashoffset={100 - progressPercent}
                  style={{
                    transition: 'stroke-dashoffset 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.95))',
                  }}
                />
              </svg>
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                {guild?.name || initialGuildName || 'Discord Server'}
              </h2>
              <p className="text-[11px] text-white/40">
                Synchronizing live configuration modules & Discord API state...
              </p>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </GuildContext.Provider>
  );
}

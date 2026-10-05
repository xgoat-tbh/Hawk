'use client';
import { apiFetch } from '@/lib/api';
import { acquireSocket, releaseSocket } from '@/lib/socket';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const requestRef = useRef(0);
  const loadedRef = useRef(false);
  const inFlight = useRef<Promise<Response> | null>(null);

  const fetchGuildBundle = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!loadedRef.current) setLoading(true);
    setError(null);

    try {
      const pending = inFlight.current || apiFetch(`/api/guilds/${guildId}`);
      inFlight.current = pending;
      const response = await pending;
      const res = response.clone();
      if (inFlight.current === pending) inFlight.current = null;
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}: Failed to load server data.`);
      }

      const data = await res.json();
      if (requestId !== requestRef.current) return;
      loadedRef.current = true;
      if (data.guild) setGuild(data.guild);
      if (data.bot) setBot(data.bot);
      if (data.channels) setChannels(data.channels);
      if (data.roles) setRoles(data.roles);
      if (data.emojis) setEmojis(data.emojis);
      if (data.config) setConfig(data.config);
      setIsOwner(Boolean(data.isOwner));
      if (data.userPermissions) setUserPermissions(data.userPermissions);
    } catch (err: any) {
      inFlight.current = null;
      console.error('Failed to fetch guild bundle:', err);
      if (requestId === requestRef.current) setError(err.message || 'Error loading server data.');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchGuildBundle();
    return () => { requestRef.current++; };
  }, [fetchGuildBundle]);

  useEffect(() => { const socket = acquireSocket(guildId); const changed = () => { void fetchGuildBundle(); }; socket.on('config:changed', changed); return () => { socket.off('config:changed', changed); releaseSocket(guildId); }; }, [guildId, fetchGuildBundle]);
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
        isOwner,
        userPermissions,
        loading,
        error,
        refreshData: fetchGuildBundle,
        updateConfigLocally,
      }}
    >
      {children}
    </GuildContext.Provider>
  );
}

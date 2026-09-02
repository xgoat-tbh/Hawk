export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions?: string;
  features?: string[];
  hasBot?: boolean;
  iconUrl?: string | null;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number; // 0: text, 2: voice, 4: category, 15: forum
  parentId?: string | null;
  position: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

import dotenv from 'dotenv';
dotenv.config();

function getBotToken(): string {
  return process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || '';
}

// In-Memory Cache Store to prevent Discord 429 Rate Limits
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

function getFromCache<T>(key: string, maxAgeMs: number): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) {
    return null; // Stale, but still saved in memoryCache as fallback
  }
  return entry.data;
}

function getStaleFallback<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  return entry ? entry.data : null;
}

function setToCache<T>(key: string, data: T) {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export async function fetchBotGuilds(): Promise<DiscordGuild[]> {
  const cached = getFromCache<DiscordGuild[]>('bot_guilds', 60_000); // 60s cache
  if (cached) return cached;

  const token = getBotToken();
  if (!token) return getStaleFallback<DiscordGuild[]>('bot_guilds') || [];

  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${token}` },
    });

    if (res.status === 429) {
      console.warn('Discord 429 on /users/@me/guilds, serving cached data.');
      return getStaleFallback<DiscordGuild[]>('bot_guilds') || [];
    }

    if (!res.ok) {
      console.warn(`Discord API error fetching bot guilds: HTTP ${res.status}`);
      return getStaleFallback<DiscordGuild[]>('bot_guilds') || [];
    }

    const guilds = (await res.json()) as DiscordGuild[];
    const mapped = guilds.map((g) => ({
      ...g,
      hasBot: true,
      iconUrl: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
        : null,
    }));

    setToCache('bot_guilds', mapped);
    return mapped;
  } catch (error) {
    console.error('Error fetching bot guilds:', error);
    return getStaleFallback<DiscordGuild[]>('bot_guilds') || [];
  }
}

export async function fetchGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  const cacheKey = `channels_${guildId}`;
  const cached = getFromCache<DiscordChannel[]>(cacheKey, 30_000); // 30s cache
  if (cached) return cached;

  const token = getBotToken();
  if (!token) return getStaleFallback<DiscordChannel[]>(cacheKey) || [];

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (res.status === 429) {
      console.warn(`Discord 429 on channels for ${guildId}, serving cached data.`);
      return getStaleFallback<DiscordChannel[]>(cacheKey) || [];
    }

    if (!res.ok) {
      console.warn(`Discord API error fetching channels for guild ${guildId}: HTTP ${res.status}`);
      return getStaleFallback<DiscordChannel[]>(cacheKey) || [];
    }

    const channels = (await res.json()) as DiscordChannel[];
    setToCache(cacheKey, channels);
    return channels;
  } catch (error) {
    console.error(`Error fetching channels for guild ${guildId}:`, error);
    return getStaleFallback<DiscordChannel[]>(cacheKey) || [];
  }
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const cacheKey = `roles_${guildId}`;
  const cached = getFromCache<DiscordRole[]>(cacheKey, 30_000); // 30s cache
  if (cached) return cached;

  const token = getBotToken();
  if (!token) return getStaleFallback<DiscordRole[]>(cacheKey) || [];

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (res.status === 429) {
      console.warn(`Discord 429 on roles for ${guildId}, serving cached data.`);
      return getStaleFallback<DiscordRole[]>(cacheKey) || [];
    }

    if (!res.ok) {
      console.warn(`Discord API error fetching roles for guild ${guildId}: HTTP ${res.status}`);
      return getStaleFallback<DiscordRole[]>(cacheKey) || [];
    }

    const roles = (await res.json()) as DiscordRole[];
    setToCache(cacheKey, roles);
    return roles;
  } catch (error) {
    console.error(`Error fetching roles for guild ${guildId}:`, error);
    return getStaleFallback<DiscordRole[]>(cacheKey) || [];
  }
}
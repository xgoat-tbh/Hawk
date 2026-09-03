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
  permissions?: string;
}

export interface DiscordEmoji {
  id: string;
  name: string;
  roles?: string[];
  user?: any;
  require_colons?: boolean;
  managed?: boolean;
  animated?: boolean;
  available?: boolean;
  url?: string;
}

import dotenv from 'dotenv';
dotenv.config();

function getBotToken(): string {
  return process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || '';
}

// In-Memory Cache Store to prevent Discord 429 Rate Limits (capped at 500 entries)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const MAX_MEMORY_CACHE_SIZE = 500;
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
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export async function fetchBotGuilds(): Promise<DiscordGuild[]> {
  const cached = getFromCache<DiscordGuild[]>('bot_guilds', 60_000); // 60s cache
  if (cached) return cached;

  // 1. Fast path: Use in-process hawkClient if available
  const hawkClient = (globalThis as any).hawkClient;
  if (hawkClient?.guilds?.cache?.size) {
    const mapped: DiscordGuild[] = Array.from(hawkClient.guilds.cache.values()).map((g: any) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: false,
      hasBot: true,
      iconUrl: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
        : null,
    }));
    setToCache('bot_guilds', mapped);
    return mapped;
  }

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

  // 1. Fast path: Use in-process hawkClient if available
  const hawkClient = (globalThis as any).hawkClient;
  if (hawkClient?.guilds?.cache) {
    const g = hawkClient.guilds.cache.get(guildId);
    if (g && g.channels?.cache?.size > 0) {
      const channels: DiscordChannel[] = Array.from(g.channels.cache.values()).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId || null,
        position: c.rawPosition ?? c.position ?? 0,
      }));
      setToCache(cacheKey, channels);
      return channels;
    }
  }

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

  // 1. Fast path: Use in-process hawkClient if available
  const hawkClient = (globalThis as any).hawkClient;
  if (hawkClient?.guilds?.cache) {
    const g = hawkClient.guilds.cache.get(guildId);
    if (g && g.roles?.cache?.size > 0) {
      const roles: DiscordRole[] = Array.from(g.roles.cache.values()).map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
        managed: r.managed,
        permissions: r.permissions?.bitfield !== undefined ? String(r.permissions.bitfield) : undefined,
      }));
      setToCache(cacheKey, roles);
      return roles;
    }
  }

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

export async function fetchGuildEmojis(guildId: string): Promise<DiscordEmoji[]> {
  const cacheKey = `emojis_${guildId}`;
  const cached = getFromCache<DiscordEmoji[]>(cacheKey, 60_000); // 60s cache
  if (cached) return cached;

  // 1. Fast path: Use in-process hawkClient if available
  const hawkClient = (globalThis as any).hawkClient;
  if (hawkClient?.guilds?.cache) {
    const g = hawkClient.guilds.cache.get(guildId);
    if (g && g.emojis?.cache?.size > 0) {
      const emojis: DiscordEmoji[] = Array.from(g.emojis.cache.values()).map((e: any) => ({
        id: e.id,
        name: e.name,
        animated: Boolean(e.animated),
        url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}?size=64&quality=lossless`,
      }));
      setToCache(cacheKey, emojis);
      return emojis;
    }
  }

  const token = getBotToken();
  if (!token) return getStaleFallback<DiscordEmoji[]>(cacheKey) || [];

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (res.status === 429) {
      console.warn(`Discord 429 on emojis for ${guildId}, serving cached data.`);
      return getStaleFallback<DiscordEmoji[]>(cacheKey) || [];
    }

    if (!res.ok) {
      console.warn(`Discord API error fetching emojis for guild ${guildId}: HTTP ${res.status}`);
      return getStaleFallback<DiscordEmoji[]>(cacheKey) || [];
    }

    const emojis = (await res.json()) as DiscordEmoji[];
    const mapped = emojis.map((e) => ({
      ...e,
      url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}?size=64&quality=lossless`,
    }));

    setToCache(cacheKey, mapped);
    return mapped;
  } catch (error) {
    console.error(`Error fetching emojis for guild ${guildId}:`, error);
    return getStaleFallback<DiscordEmoji[]>(cacheKey) || [];
  }
}

export async function fetchGuildMember(guildId: string, userId: string): Promise<{ roles: string[]; permissions?: string; user?: any } | null> {
  const cacheKey = `member_${guildId}_${userId}`;
  const cached = getFromCache<{ roles: string[]; permissions?: string; user?: any }>(cacheKey, 30_000);
  if (cached) return cached;

  // 1. Fast path: Use in-process hawkClient if available
  const hawkClient = (globalThis as any).hawkClient;
  if (hawkClient?.guilds?.cache) {
    const g = hawkClient.guilds.cache.get(guildId);
    if (g) {
      const m = g.members.cache.get(userId);
      if (m) {
        const memberData = {
          roles: Array.from(m.roles.cache.keys()) as string[],
          permissions: m.permissions?.bitfield !== undefined ? String(m.permissions.bitfield) : undefined,
          user: { id: m.user.id, username: m.user.username, avatar: m.user.avatar },
        };
        setToCache(cacheKey, memberData);
        return memberData;
      }
    }
  }

  const token = getBotToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!res.ok) return null;
    const member = await res.json();
    setToCache(cacheKey, member);
    return member;
  } catch (error) {
    console.error(`Error fetching member ${userId} in guild ${guildId}:`, error);
    return null;
  }
}

export async function fetchGuildDetails(guildId: string): Promise<{ id: string; name: string; icon: string | null; owner_id: string } | null> {
  const cacheKey = `guild_details_${guildId}`;
  const cached = getFromCache<{ id: string; name: string; icon: string | null; owner_id: string }>(cacheKey, 60_000);
  if (cached) return cached;

  // 1. Fast path: Use in-process hawkClient if available
  const hawkClient = (globalThis as any).hawkClient;
  if (hawkClient?.guilds?.cache) {
    const g = hawkClient.guilds.cache.get(guildId);
    if (g) {
      const details = {
        id: g.id,
        name: g.name,
        icon: g.icon,
        owner_id: g.ownerId,
      };
      setToCache(cacheKey, details);
      return details;
    }
  }

  const token = getBotToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!res.ok) return null;
    const data = await res.json();
    setToCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching guild details for ${guildId}:`, error);
    return null;
  }
}

export async function exchangeOAuthCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; token_type: string; scope: string } | null> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const res = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('Discord OAuth code exchange failed:', err);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Error in exchangeOAuthCode:', error);
    return null;
  }
}

export async function fetchUserProfile(
  accessToken: string,
): Promise<{ id: string; username: string; discriminator: string; avatar: string | null; email?: string } | null> {
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
}

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error in fetchUserGuilds:', error);
    return [];
  }
}

export async function fetchBotProfile(
  guildId?: string,
): Promise<{ id: string; name: string; avatarUrl: string | null; username: string }> {
  const cacheKey = `bot_profile_${guildId || 'global'}`;
  const cached = getFromCache<{ id: string; name: string; avatarUrl: string | null; username: string }>(cacheKey, 60_000);
  if (cached) return cached;

  const token = getBotToken();
  if (!token) {
    return { id: 'bot', name: 'Hawk', avatarUrl: null, username: 'Hawk' };
  }

  try {
    const meRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!meRes.ok) throw new Error('Failed to fetch bot user');
    const me = await meRes.json();

    let name = me.username;
    let avatar = me.avatar;

    if (guildId) {
      try {
        const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/@me`, {
          headers: { Authorization: `Bot ${token}` },
        });
        if (memberRes.ok) {
          const member = await memberRes.json();
          if (member.nick) name = member.nick;
          if (member.avatar) avatar = member.avatar;
        }
      } catch {
        // Fallback to global profile
      }
    }

    const avatarUrl = avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${avatar}.png?size=128`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const result = { id: me.id, name, avatarUrl, username: me.username };
    setToCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Error fetching bot profile:', err);
    return { id: 'bot', name: 'Hawk', avatarUrl: null, username: 'Hawk' };
  }
}

export async function sendChannelMessage(channelId: string, content: string): Promise<string | null> {
  const token = getBotToken();
  if (!token) return null;
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        allowed_mentions: { parse: [] },
      }),
    });
    if (!res.ok) {
      console.warn(`Failed to send message to channel ${channelId}: HTTP ${res.status}`);
      return null;
    }
    const msg = await res.json();
    return msg.id;
  } catch (err) {
    console.error('Error sending Discord channel message:', err);
    return null;
  }
}

export async function deleteChannelMessage(channelId: string, messageId: string): Promise<boolean> {
  const token = getBotToken();
  if (!token || !messageId || messageId === '0') return false;
  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bot ${token}`,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
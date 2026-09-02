export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
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

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || '';

export function getDiscordOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
    prompt: 'consent',
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export function getBotInviteUrl(guildId?: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    permissions: '8', // Administrator
    scope: 'bot applications.commands',
  });
  if (guildId) params.append('guild_id', guildId);
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Discord OAuth token error: ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function fetchDiscordUser(accessToken: string) {
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Discord user');
  return res.json();
}

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const guilds = (await res.json()) as DiscordGuild[];

  // Filter for MANAGE_GUILD (0x20) or ADMINISTRATOR (0x8)
  return guilds.filter((g) => {
    const perm = BigInt(g.permissions || 0);
    const isAdmin = (perm & 0x8n) === 0x8n;
    const isManager = (perm & 0x20n) === 0x20n;
    return g.owner || isAdmin || isManager;
  });
}

export async function fetchBotGuildIds(): Promise<Set<string>> {
  if (!BOT_TOKEN) return new Set();
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
  });
  if (!res.ok) return new Set();
  const guilds = (await res.json()) as { id: string }[];
  return new Set(guilds.map((g) => g.id));
}

export async function fetchGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  if (!BOT_TOKEN) return [];
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  if (!BOT_TOKEN) return [];
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  return res.json();
}

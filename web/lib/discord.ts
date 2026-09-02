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

const BOT_TOKEN = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN || '';

export async function fetchBotGuilds(): Promise<DiscordGuild[]> {
  if (!BOT_TOKEN) return [];
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const guilds = (await res.json()) as DiscordGuild[];
    return guilds.map((g) => ({
      ...g,
      hasBot: true,
      iconUrl: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
        : null,
    }));
  } catch (error) {
    console.error('Error fetching bot guilds:', error);
    return [];
  }
}

export async function fetchGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  if (!BOT_TOKEN) return [];
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error(`Error fetching channels for guild ${guildId}:`, error);
    return [];
  }
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  if (!BOT_TOKEN) return [];
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error(`Error fetching roles for guild ${guildId}:`, error);
    return [];
  }
}


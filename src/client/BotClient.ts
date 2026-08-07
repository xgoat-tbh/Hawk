import { Client, GatewayIntentBits, Partials, Options, ActivityType } from 'discord.js';
import { constants } from '../core/config/constants.js';
import { guilds } from '../core/config/guilds.js';

export function createClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
    partials: [Partials.Message, Partials.Channel],
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: 200,
      GuildMemberManager: { maxSize: 10000 },
      ReactionManager: 100,
      ReactionUserManager: 100,
    }),
    sweepers: { ...Options.DefaultSweeperSettings, messages: { interval: 300, lifetime: 60 } },
  });
}

export function updateBotActivity(client: Client, prefix = constants.defaultPrefix): void {
  if (!client.user) return;
  const primaryGuild = client.guilds.cache.get(guilds.primary);
  const memberCount = primaryGuild
    ? primaryGuild.memberCount
    : client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);

  client.user.setActivity(`${memberCount} Members | ${prefix}help`, {
    type: ActivityType.Watching,
  });
}

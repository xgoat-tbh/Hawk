import type { Guild, GuildTextBasedChannel, GuildMember, User } from 'discord.js';
import { getLogChannel } from '../database/repositories/guildConfigRepo.js';
import { ui } from '../ui/index.js';
import { formatUser } from '../utils/formatters.js';

export interface AuditLogOptions {
  guild: Guild;
  action: string;
  executor: GuildMember | User | string;
  target?: string;
  channelName?: string;
  details?: string | string[];
}

export async function logAuditAction(options: AuditLogOptions): Promise<void> {
  const { guild, action, executor, target, channelName, details } = options;

  try {
    const logChannelId = await getLogChannel(guild.id);
    if (!logChannelId) return;

    const channel = (guild.channels.cache.get(logChannelId) ??
      (await guild.channels.fetch(logChannelId).catch(() => null))) as GuildTextBasedChannel | null;

    if (!channel || !('send' in channel)) return;

    const executorDisplay = formatUser(executor, guild);
    const unixNow = Math.floor(Date.now() / 1000);

    const sections: string[] = [
      `• **Action:** ${action}\n` +
      `• **Moderator:** ${executorDisplay}\n` +
      `• **Time:** <t:${unixNow}:F> (<t:${unixNow}:R>)` +
      (channelName ? `\n• **Channel:** ${channelName}` : '') +
      (target ? `\n• **Target:** ${target}` : ''),
    ];

    if (details) {
      if (Array.isArray(details)) {
        sections.push(details.join('\n'));
      } else {
        sections.push(details);
      }
    }

    const payload = ui.standard({
      title: `Audit Log | ${action}`,
      sections,
    });

    await channel.send({
      components: payload.components,
      flags: payload.flags as any,
      allowedMentions: { parse: [], roles: [], users: [] },
    }).catch(() => {});
  } catch {
    // Non-blocking: fail quietly if logging fails
  }
}

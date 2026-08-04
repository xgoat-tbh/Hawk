import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { setAfk } from '../../core/database/repositories/afkRepo.js';
import { buildAfkSetPayload, AFK_ALLOWED_MENTIONS } from './afkUI.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'afk',
  module: 'general',
  description: 'Set your AFK status with an optional reason.',
  usage: 'afk [reason]',
  examples: ['afk', 'afk studying for exams', 'afk eating lunch'],
  permissions: [],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, member, channel, parsed } = ctx;

    const rawReason = parsed.rawArgs.trim();
    const reason = rawReason || 'AFK';

    await setAfk(guild.id, member.id, reason);

    const payload = buildAfkSetPayload(member.id, rawReason);
    const setMsg = await (channel as GuildTextBasedChannel).send({
      ...payload,
      allowedMentions: AFK_ALLOWED_MENTIONS,
    }).catch(() => null);

    if (setMsg) {
      setTimeout(() => {
        setMsg.delete().catch(() => {});
      }, 6000);
    }

    logEvent('info', 'command_execution', `AFK status set by ${member.user.tag}`, {
      user: member.user.tag,
      userId: member.id,
      guild: guild.name,
      guildId: guild.id,
      reason,
    });
  },
});

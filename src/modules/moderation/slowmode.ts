import { PermissionsBitField } from 'discord.js';
import type { TextChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export function parseSlowmodeDuration(input: string): number | null {
  const clean = input.toLowerCase().trim();
  if (clean === 'off' || clean === '0' || clean === '0s') return 0;

  const match = /^(\d+)\s*(s|sec|m|min|h|hour)?$/.exec(clean);
  if (!match) return null;

  const val = parseInt(match[1], 10);
  const unit = match[2] ?? 's';

  let seconds = val;
  if (unit.startsWith('m')) seconds = val * 60;
  else if (unit.startsWith('h')) seconds = val * 3600;

  // Discord limit: 0 to 21600 seconds (6 hours)
  if (seconds < 0 || seconds > 21600) return null;
  return seconds;
}

export default defineCommand({
  name: 'slowmode',
  aliases: ['sm', 'slow', 'cooldown'],
  module: 'moderation',
  description: 'Set Discord native slowmode on current text channel.',
  usage: 'slowmode <duration|off>',
  examples: ['slowmode 10s', 'slowmode 5m', 'slowmode off'],
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, respond, member } = ctx;

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}slowmode <duration|off>\` (e.g. \`10s\`, \`5m\`, \`off\`)`);
      return;
    }

    const durationSeconds = parseSlowmodeDuration(parsed.args[0]);
    if (durationSeconds === null) {
      await respond.error('Invalid slowmode duration. Max 6 hours (`21600s` or `6h`), or `off`.');
      return;
    }

    const textChannel = channel as TextChannel;
    if (!textChannel.setRateLimitPerUser) {
      await respond.error('Slowmode can only be configured on text channels.');
      return;
    }

    await textChannel.setRateLimitPerUser(durationSeconds);

    if (durationSeconds === 0) {
      await respond.success(`Slowmode turned off for ${mentionChannel(channel.id)}.`);
    } else {
      await respond.success(`Slowmode set to **${durationSeconds}s** for ${mentionChannel(channel.id)}.`);
    }

    logEvent('info', 'command_execution', `Slowmode set by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      channel: channel.name,
      channelId: channel.id,
      seconds: durationSeconds,
    });
  },
});

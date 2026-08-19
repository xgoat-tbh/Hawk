import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'vcunmuteall',
  aliases: ['unmuteallvc', 'unmuteall'],
  module: 'voice',
  description: 'Server-unmute all non-bot members in your voice channel or a specified channel.',
  usage: 'vcunmuteall [voice-channel]',
  examples: ['vcunmuteall', 'vcunmuteall General'],
  permissions: [PermissionsBitField.Flags.MuteMembers],
  botPermissions: [PermissionsBitField.Flags.MuteMembers],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;

    let targetVc: VoiceBasedChannel;
    if (parsed.args.length === 0) {
      if (!member.voice.channel) {
        await respond.error('You must be in a voice channel, or specify a target channel.');
        return;
      }
      targetVc = member.voice.channel;
    } else {
      const res = resolveVoiceChannel(parsed.args.join(' '), guild);
      if (!res.success) {
        await respond.error(res.error);
        return;
      }
      targetVc = res.value.channel;
    }

    const access = await checkVoiceAccess(guild.id, member, 'vcunmuteall', targetVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const targets = targetVc.members.filter((m) => !m.user.bot && !!m.voice.serverMute);
    if (targets.size === 0) {
      await respond.info(`No server-muted members to unmute in **${targetVc.name}**.`);
      return;
    }

    let unmutedCount = 0;
    const failures: string[] = [];

    for (const target of targets.values()) {
      try {
        await target.voice.setMute(false, `VCUnmuteAll invoked by ${member.user.tag}`);
        unmutedCount++;
      } catch {
        failures.push(target.displayName || target.user.username);
      }
    }

    if (failures.length === 0) {
      await respond.success(`Server-unmuted **${unmutedCount}** member${unmutedCount === 1 ? '' : 's'} in **${targetVc.name}**.`);
    } else {
      await respond.send(`> Server-unmuted **${unmutedCount}** members in **${targetVc.name}**.\n> **Notice:** Failed for ${failures.length} member(s).`);
    }
  },
});

import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'vcmuteall',
  aliases: ['muteallvc', 'muteall'],
  module: 'voice',
  description: 'Server-mute all non-bot members in your voice channel or a specified channel.',
  usage: 'vcmuteall [voice-channel]',
  examples: ['vcmuteall', 'vcmuteall General'],
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

    const access = await checkVoiceAccess(guild.id, member, 'vcmuteall', targetVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const targets = targetVc.members.filter((m) => !m.user.bot && !m.voice.serverMute && m.id !== member.id);
    if (targets.size === 0) {
      await respond.info(`No unmuted members to mute in **${targetVc.name}**.`);
      return;
    }

    let mutedCount = 0;
    const failures: string[] = [];

    for (const target of targets.values()) {
      try {
        await target.voice.setMute(true, `VCMuteAll invoked by ${member.user.tag}`);
        mutedCount++;
      } catch {
        failures.push(target.displayName || target.user.username);
      }
    }

    if (failures.length === 0) {
      await respond.success(`Server-muted **${mutedCount}** member${mutedCount === 1 ? '' : 's'} in **${targetVc.name}**.`);
    } else {
      await respond.send(`> Server-muted **${mutedCount}** members in **${targetVc.name}**.\n> **Notice:** Failed for ${failures.length} member(s).`);
    }
  },
});

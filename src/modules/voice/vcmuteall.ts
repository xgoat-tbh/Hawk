import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'vcmuteall',
  aliases: ['muteallvc', 'muteall', 'vcunmuteall', 'unmuteallvc', 'unmuteall'],
  module: 'voice',
  description: 'Server-mute or unmute all non-bot members in your voice channel or a specified channel.',
  usage: 'vcmuteall [voice-channel] [on|off] | vcunmuteall [voice-channel]',
  examples: ['vcmuteall', 'vcmuteall General', 'vcunmuteall', 'vcunmuteall General', 'vcmuteall off'],
  permissions: [PermissionsBitField.Flags.MuteMembers],
  botPermissions: [PermissionsBitField.Flags.MuteMembers],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;
    const aliasUsed = parsed.aliasUsed.toLowerCase();

    const isExplicitUnmute = ['vcunmuteall', 'unmuteallvc', 'unmuteall'].includes(aliasUsed);
    let targetMuteState = !isExplicitUnmute;

    let args = [...parsed.args];
    const lastArg = args[args.length - 1]?.toLowerCase();
    if (lastArg === 'off' || lastArg === 'unmute' || lastArg === 'false') {
      targetMuteState = false;
      args.pop();
    } else if (lastArg === 'on' || lastArg === 'mute' || lastArg === 'true') {
      targetMuteState = true;
      args.pop();
    }

    let targetVc: VoiceBasedChannel;
    if (args.length === 0) {
      if (!member.voice.channel) {
        await respond.error('You must be in a voice channel, or specify a target channel.');
        return;
      }
      targetVc = member.voice.channel;
    } else {
      const res = resolveVoiceChannel(args.join(' '), guild);
      if (!res.success) {
        await respond.error(res.error);
        return;
      }
      targetVc = res.value.channel;
    }

    const cmdName = targetMuteState ? 'vcmuteall' : 'vcunmuteall';
    const access = await checkVoiceAccess(guild.id, member, cmdName, targetVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const targets = targetVc.members.filter((m) => {
      if (m.user.bot) return false;
      if (targetMuteState && m.id === member.id) return false;
      if (targetMuteState && m.voice.serverMute) return false;
      if (!targetMuteState && !m.voice.serverMute) return false;
      return true;
    });

    if (targets.size === 0) {
      await respond.info(`No members to ${targetMuteState ? 'mute' : 'unmute'} in **${targetVc.name}**.`);
      return;
    }

    let processedCount = 0;
    const failures: string[] = [];

    const reason = `${targetMuteState ? 'VCMuteAll' : 'VCUnmuteAll'} invoked by ${member.user.tag}`;
    for (const target of targets.values()) {
      try {
        await target.voice.setMute(targetMuteState, reason);
        processedCount++;
      } catch {
        failures.push(target.displayName || target.user.username);
      }
    }

    const actionText = targetMuteState ? 'Server-muted' : 'Server-unmuted';
    if (failures.length === 0) {
      await respond.success(`${actionText} **${processedCount}** member${processedCount === 1 ? '' : 's'} in **${targetVc.name}**.`);
    } else {
      await respond.send(`> ${actionText} **${processedCount}** members in **${targetVc.name}**.\n> **Notice:** Failed for ${failures.length} member(s).`);
    }
  },
});

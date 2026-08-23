import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'vcdeafenall',
  aliases: ['deafenallvc', 'deafenall', 'vcundeafenall', 'undeafenallvc', 'undeafenall'],
  module: 'voice',
  description: 'Server-deafen or undeafen all non-bot members in your voice channel or a specified channel.',
  usage: 'vcdeafenall [voice-channel] [on|off] | vcundeafenall [voice-channel]',
  examples: ['vcdeafenall', 'vcdeafenall General', 'vcundeafenall', 'vcundeafenall General', 'vcdeafenall off'],
  permissions: [PermissionsBitField.Flags.DeafenMembers],
  botPermissions: [PermissionsBitField.Flags.DeafenMembers],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;
    const aliasUsed = parsed.aliasUsed.toLowerCase();

    const isExplicitUndeafen = ['vcundeafenall', 'undeafenallvc', 'undeafenall'].includes(aliasUsed);
    let targetDeafState = !isExplicitUndeafen;

    let args = [...parsed.args];
    const lastArg = args[args.length - 1]?.toLowerCase();
    if (lastArg === 'off' || lastArg === 'undeafen' || lastArg === 'false') {
      targetDeafState = false;
      args.pop();
    } else if (lastArg === 'on' || lastArg === 'deafen' || lastArg === 'true') {
      targetDeafState = true;
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

    const cmdName = targetDeafState ? 'vcdeafenall' : 'vcundeafenall';
    const access = await checkVoiceAccess(guild.id, member, cmdName, targetVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const targets = targetVc.members.filter((m) => {
      if (m.user.bot) return false;
      if (targetDeafState && m.id === member.id) return false;
      if (targetDeafState && m.voice.serverDeaf) return false;
      if (!targetDeafState && !m.voice.serverDeaf) return false;
      return true;
    });

    if (targets.size === 0) {
      await respond.info(`No members to ${targetDeafState ? 'deafen' : 'undeafen'} in **${targetVc.name}**.`);
      return;
    }

    let processedCount = 0;
    const failures: string[] = [];

    const reason = `${targetDeafState ? 'VCDeafenAll' : 'VCUndeafenAll'} invoked by ${member.user.tag}`;
    for (const target of targets.values()) {
      try {
        await target.voice.setDeaf(targetDeafState, reason);
        processedCount++;
      } catch {
        failures.push(target.displayName || target.user.username);
      }
    }

    const actionText = targetDeafState ? 'Server-deafened' : 'Server-undeafened';
    if (failures.length === 0) {
      await respond.success(`${actionText} **${processedCount}** member${processedCount === 1 ? '' : 's'} in **${targetVc.name}**.`);
    } else {
      await respond.send(`> ${actionText} **${processedCount}** members in **${targetVc.name}**.\n> **Notice:** Failed for ${failures.length} member(s).`);
    }
  },
});

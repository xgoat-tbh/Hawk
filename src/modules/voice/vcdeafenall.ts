import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'vcdeafenall',
  aliases: ['deafenallvc', 'deafenall'],
  module: 'voice',
  description: 'Server-deafen all non-bot members in your voice channel or a specified channel.',
  usage: 'vcdeafenall [voice-channel]',
  examples: ['vcdeafenall', 'vcdeafenall General'],
  permissions: [PermissionsBitField.Flags.DeafenMembers],
  botPermissions: [PermissionsBitField.Flags.DeafenMembers],
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

    const access = await checkVoiceAccess(guild.id, member, 'vcdeafenall', targetVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const targets = targetVc.members.filter((m) => !m.user.bot && !m.voice.serverDeaf && m.id !== member.id);
    if (targets.size === 0) {
      await respond.info(`No undeafened members to deafen in **${targetVc.name}**.`);
      return;
    }

    let deafenedCount = 0;
    const failures: string[] = [];

    for (const target of targets.values()) {
      try {
        await target.voice.setDeaf(true, `VCDeafenAll invoked by ${member.user.tag}`);
        deafenedCount++;
      } catch {
        failures.push(target.displayName || target.user.username);
      }
    }

    if (failures.length === 0) {
      await respond.success(`Server-deafened **${deafenedCount}** member${deafenedCount === 1 ? '' : 's'} in **${targetVc.name}**.`);
    } else {
      await respond.send(`> Server-deafened **${deafenedCount}** members in **${targetVc.name}**.\n> **Notice:** Failed for ${failures.length} member(s).`);
    }
  },
});

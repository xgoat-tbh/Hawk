import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'vcundeafenall',
  aliases: ['undeafenallvc', 'undeafenall'],
  module: 'voice',
  description: 'Server-undeafen all non-bot members in your voice channel or a specified channel.',
  usage: 'vcundeafenall [voice-channel]',
  examples: ['vcundeafenall', 'vcundeafenall General'],
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

    const access = await checkVoiceAccess(guild.id, member, 'vcundeafenall', targetVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const targets = targetVc.members.filter((m) => !m.user.bot && !!m.voice.serverDeaf);
    if (targets.size === 0) {
      await respond.info(`No server-deafened members to undeafen in **${targetVc.name}**.`);
      return;
    }

    let undeafenedCount = 0;
    const failures: string[] = [];

    for (const target of targets.values()) {
      try {
        await target.voice.setDeaf(false, `VCUndeafenAll invoked by ${member.user.tag}`);
        undeafenedCount++;
      } catch {
        failures.push(target.displayName || target.user.username);
      }
    }

    if (failures.length === 0) {
      await respond.success(`Server-undeafened **${undeafenedCount}** member${undeafenedCount === 1 ? '' : 's'} in **${targetVc.name}**.`);
    } else {
      await respond.send(`> Server-undeafened **${undeafenedCount}** members in **${targetVc.name}**.\n> **Notice:** Failed for ${failures.length} member(s).`);
    }
  },
});

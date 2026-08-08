import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'vcslam',
  aliases: ['slam', 'vslam', 'vcraidcontrol', 'vcmutedeafen'],
  module: 'moderation',
  description: 'Mass server-mute and deafen all members in a voice channel to stop VC raids or nuisances (exempts staff).',
  usage: 'vcslam [voice_channel]',
  examples: ['vcslam', 'vcslam "Gaming Lounge"'],
  permissions: [PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers],
  botPermissions: [PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;

    let targetVc: VoiceBasedChannel | null = member.voice.channel as VoiceBasedChannel | null;

    if (parsed.args.length > 0) {
      const res = resolveVoiceChannel(parsed.args[0], guild);
      if (!res.success) {
        await respond.error(`Voice Channel: ${res.error}`);
        return;
      }
      targetVc = res.value.channel as VoiceBasedChannel;
    }

    if (!targetVc) {
      await respond.error('You must be in a voice channel or specify a target voice channel.');
      return;
    }

    const membersInVc = Array.from(targetVc.members.values());
    if (membersInVc.length === 0) {
      await respond.info(`No members are currently connected to ${mentionChannel(targetVc.id)}.`);
      return;
    }

    // Filter targets: Exclude command author & staff with MuteMembers / DeafenMembers / Admin perms
    const targets = membersInVc.filter((m) => {
      if (m.id === member.id) return false;
      const isStaff =
        m.permissions.has(PermissionsBitField.Flags.MuteMembers) ||
        m.permissions.has(PermissionsBitField.Flags.DeafenMembers) ||
        m.permissions.has(PermissionsBitField.Flags.Administrator) ||
        m.permissions.has(PermissionsBitField.Flags.ManageGuild);
      return !isStaff;
    });

    if (targets.length === 0) {
      await respond.info(`No non-staff members found to mute/deafen in ${mentionChannel(targetVc.id)}.`);
      return;
    }

    // Check if the majority are currently server-muted/deafened to decide toggle direction
    const mutedCount = targets.filter((m) => m.voice.serverMute || m.voice.serverDeaf).length;
    const shouldMute = mutedCount < targets.length;

    let affectedCount = 0;
    const CHUNK_SIZE = 5;
    for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
      const chunk = targets.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map(async (target) => {
          try {
            await target.voice.setMute(shouldMute, `VC Slam by ${member.user.tag}`);
            await target.voice.setDeaf(shouldMute, `VC Slam by ${member.user.tag}`);
            return true;
          } catch {
            return false;
          }
        })
      );
      affectedCount += results.filter(Boolean).length;
    }

    const actionText = shouldMute ? 'Muted & Deafened' : 'Unmuted & Undeafened';
    await respond.success(
      `Successfully **${actionText} ${affectedCount} member(s)** in ${mentionChannel(targetVc.id)}.`
    );

    logEvent('info', 'command_execution', `VC Slam toggled by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      vc: targetVc.name,
      vcId: targetVc.id,
      action: actionText,
      affectedCount,
    });
  },
});

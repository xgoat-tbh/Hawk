import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { isMemberManageable } from './roleHelpers.js';
import { mentionChannel } from '../../core/utils/formatters.js';

export default defineCommand({
  name: 'vcmute',
  aliases: ['vm', 'voicemute', 'vmute', 'vcunmute', 'vum', 'voiceunmute', 'vunmute'],
  module: 'moderation',
  description: 'Server mute or unmute members in voice, or all members in a voice channel.',
  usage: 'vcmute <targets...> [on|off] | vcmute all [channel] [on|off] | vcunmute <targets...> | vcunmute all [channel]',
  examples: [
    'vcmute @User',
    'vcunmute @User',
    'vcmute @User on',
    'vcmute @User off',
    'vcmute all',
    'vcunmute all',
    'vcmute all #General',
  ],
  permissions: [PermissionsBitField.Flags.MuteMembers],
  botPermissions: [PermissionsBitField.Flags.MuteMembers],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;
    const aliasUsed = parsed.aliasUsed.toLowerCase();

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}vcmute <targets...> [on|off]\` or \`${parsed.prefix}vcunmute <targets...>\``);
      return;
    }

    const isExplicitUnmute = ['vcunmute', 'vum', 'voiceunmute', 'vunmute'].includes(aliasUsed);
    let targetMuteState = !isExplicitUnmute;

    let args = [...parsed.args];
    const lastArg = args[args.length - 1].toLowerCase();
    if (lastArg === 'off' || lastArg === 'unmute' || lastArg === 'false') {
      targetMuteState = false;
      args.pop();
    } else if (lastArg === 'on' || lastArg === 'mute' || lastArg === 'true') {
      targetMuteState = true;
      args.pop();
    }

    if (args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}vcmute <targets...>\` or \`${parsed.prefix}vcmute all [channel]\``);
      return;
    }

    const isAll = args.some((a) => ['all', '?all', '*'].includes(a.toLowerCase()));

    if (isAll) {
      const nonAllArgs = args.filter((a) => !['all', '?all', '*'].includes(a.toLowerCase()));
      let targetVc: VoiceBasedChannel | null = null;

      if (nonAllArgs.length > 0) {
        const vcQuery = nonAllArgs.join(' ');
        const vcRes = resolveVoiceChannel(vcQuery, guild);
        if (!vcRes.success) {
          await respond.error(vcRes.error);
          return;
        }
        targetVc = vcRes.value.channel;
      } else {
        targetVc = member.voice.channel;
      }

      if (!targetVc) {
        await respond.error(`You must be connected to a voice channel or specify a channel to ${targetMuteState ? 'mute' : 'unmute'} all.`);
        return;
      }

      const connectedMembers = Array.from(targetVc.members.values());
      const eligibleMembers = connectedMembers.filter((m) => {
        if (targetMuteState && m.id === member.id) return false;
        if (!isMemberManageable(guild, m, member)) return false;
        if (targetMuteState && m.voice.serverMute) return false; // already muted
        if (!targetMuteState && !m.voice.serverMute) return false; // already unmuted
        return true;
      });

      if (eligibleMembers.length === 0) {
        await respond.info(`No manageable members to ${targetMuteState ? 'mute' : 'unmute'} found in ${mentionChannel(targetVc.id)}.`);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      const actionReason = targetMuteState ? `VCMute All by ${member.user.tag}` : `VCUnmute All by ${member.user.tag}`;
      const results = await Promise.allSettled(
        eligibleMembers.map((m) => m.voice.setMute(targetMuteState, actionReason)),
      );

      for (const res of results) {
        if (res.status === 'fulfilled') successCount++;
        else failCount++;
      }

      const actionText = targetMuteState ? 'Muted' : 'Unmuted';
      await respond.success(
        `${actionText} **${successCount}** user(s) in ${mentionChannel(targetVc.id)}.${failCount > 0 ? ` (Failed: ${failCount})` : ''}`,
      );

      logEvent('info', 'command_execution', `${targetMuteState ? 'VCMute' : 'VCUnmute'} All by ${member.user.tag}`, {
        executor: member.user.tag,
        executorId: member.id,
        guild: guild.name,
        guildId: guild.id,
        channel: targetVc.name,
        targetMuteState,
        successCount,
        failCount,
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const arg of args) {
      const res = await resolveUser(arg, guild);
      if (res.success && res.value.member) {
        const targetMember = res.value.member;
        if (!isMemberManageable(guild, targetMember, member)) {
          failCount++;
          continue;
        }
        if (targetMember.voice.channel) {
          try {
            await targetMember.voice.setMute(targetMuteState);
            successCount++;
          } catch {
            failCount++;
          }
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    }

    const actionText = targetMuteState ? 'Muted' : 'Unmuted';
    await respond.success(`${actionText} **${successCount}** user(s) in voice.${failCount > 0 ? ` Failed/Not in VC: ${failCount}` : ''}`);

    logEvent('info', 'command_execution', `${targetMuteState ? 'VCMute' : 'VCUnmute'} by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetMuteState,
      successCount,
      failCount,
    });
  },
});

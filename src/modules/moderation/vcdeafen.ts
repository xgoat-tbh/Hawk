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
  name: 'vcdeafen',
  aliases: ['vd', 'voicedeafen', 'vdeaf', 'vcundeafen', 'vud', 'voiceundeafen', 'vundeafen'],
  module: 'moderation',
  description: 'Server deafen or undeafen members in voice, or all members in a voice channel.',
  usage: 'vcdeafen <targets...> [on|off] | vcdeafen all [channel] [on|off] | vcundeafen <targets...> | vcundeafen all [channel]',
  examples: [
    'vcdeafen @User',
    'vcundeafen @User',
    'vcdeafen @User on',
    'vcdeafen @User off',
    'vcdeafen all',
    'vcundeafen all',
    'vcdeafen all #General',
  ],
  permissions: [PermissionsBitField.Flags.DeafenMembers],
  botPermissions: [PermissionsBitField.Flags.DeafenMembers],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;
    const aliasUsed = parsed.aliasUsed.toLowerCase();

    if (parsed.args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}vcdeafen <targets...> [on|off]\` or \`${parsed.prefix}vcundeafen <targets...>\``);
      return;
    }

    const isExplicitUndeafen = ['vcundeafen', 'vud', 'voiceundeafen', 'vundeafen'].includes(aliasUsed);
    let targetDeafState = !isExplicitUndeafen;

    let args = [...parsed.args];
    const lastArg = args[args.length - 1].toLowerCase();
    if (lastArg === 'off' || lastArg === 'undeafen' || lastArg === 'false') {
      targetDeafState = false;
      args.pop();
    } else if (lastArg === 'on' || lastArg === 'deafen' || lastArg === 'true') {
      targetDeafState = true;
      args.pop();
    }

    if (args.length === 0) {
      await respond.error(`Usage: \`${parsed.prefix}vcdeafen <targets...>\` or \`${parsed.prefix}vcdeafen all [channel]\``);
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
        await respond.error(`You must be connected to a voice channel or specify a channel to ${targetDeafState ? 'deafen' : 'undeafen'} all.`);
        return;
      }

      const connectedMembers = Array.from(targetVc.members.values());
      const eligibleMembers = connectedMembers.filter((m) => {
        if (targetDeafState && m.id === member.id) return false;
        if (!isMemberManageable(guild, m, member)) return false;
        if (targetDeafState && m.voice.serverDeaf) return false; // already deafened
        if (!targetDeafState && !m.voice.serverDeaf) return false; // already undeafened
        return true;
      });

      if (eligibleMembers.length === 0) {
        await respond.info(`No manageable members to ${targetDeafState ? 'deafen' : 'undeafen'} found in ${mentionChannel(targetVc.id)}.`);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      const actionReason = targetDeafState ? `VCDeafen All by ${member.user.tag}` : `VCUndeafen All by ${member.user.tag}`;
      const results = await Promise.allSettled(
        eligibleMembers.map((m) => m.voice.setDeaf(targetDeafState, actionReason)),
      );

      for (const res of results) {
        if (res.status === 'fulfilled') successCount++;
        else failCount++;
      }

      const actionText = targetDeafState ? 'Deafened' : 'Undeafened';
      await respond.success(
        `${actionText} **${successCount}** user(s) in ${mentionChannel(targetVc.id)}.${failCount > 0 ? ` (Failed: ${failCount})` : ''}`,
      );

      logEvent('info', 'command_execution', `${targetDeafState ? 'VCDeafen' : 'VCUndeafen'} All by ${member.user.tag}`, {
        executor: member.user.tag,
        executorId: member.id,
        guild: guild.name,
        guildId: guild.id,
        channel: targetVc.name,
        targetDeafState,
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
            await targetMember.voice.setDeaf(targetDeafState);
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

    const actionText = targetDeafState ? 'Deafened' : 'Undeafened';
    await respond.success(`${actionText} **${successCount}** user(s) in voice.${failCount > 0 ? ` Failed/Not in VC: ${failCount}` : ''}`);

    logEvent('info', 'command_execution', `${targetDeafState ? 'VCDeafen' : 'VCUndeafen'} by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetDeafState,
      successCount,
      failCount,
    });
  },
});

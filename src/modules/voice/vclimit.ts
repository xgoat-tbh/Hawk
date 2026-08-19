import { PermissionsBitField } from 'discord.js';
import type { VoiceChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'vclimit',
  aliases: ['userlimit', 'limitvc'],
  module: 'voice',
  description: 'View or set the user limit for a voice channel (0 = unlimited).',
  usage: 'vclimit [limit] [channel] OR vclimit [channel] [limit]',
  examples: ['vclimit', 'vclimit 5', 'vclimit 0', 'vclimit General 10'],
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;

    let targetVc: VoiceChannel | null = null;
    let newLimit: number | null = null;

    if (parsed.args.length === 0) {
      if (!member.voice.channel) {
        await respond.error('You must be in a voice channel to view its limit, or specify a limit to set.');
        return;
      }
      targetVc = member.voice.channel as VoiceChannel;
    } else if (parsed.args.length === 1) {
      const parsedNum = parseInt(parsed.args[0], 10);
      if (!isNaN(parsedNum)) {
        newLimit = parsedNum;
        if (!member.voice.channel) {
          await respond.error('You must be in a voice channel to change its limit.');
          return;
        }
        targetVc = member.voice.channel as VoiceChannel;
      } else {
        const res = resolveVoiceChannel(parsed.args[0], guild);
        if (!res.success) {
          await respond.error(res.error);
          return;
        }
        targetVc = res.value.channel as VoiceChannel;
      }
    } else {
      // 2 or more args
      const firstNum = parseInt(parsed.args[0], 10);
      const lastNum = parseInt(parsed.args[parsed.args.length - 1], 10);

      if (!isNaN(firstNum)) {
        newLimit = firstNum;
        const chanInput = parsed.args.slice(1).join(' ');
        const res = resolveVoiceChannel(chanInput, guild);
        if (!res.success) {
          await respond.error(res.error);
          return;
        }
        targetVc = res.value.channel as VoiceChannel;
      } else if (!isNaN(lastNum)) {
        newLimit = lastNum;
        const chanInput = parsed.args.slice(0, -1).join(' ');
        const res = resolveVoiceChannel(chanInput, guild);
        if (!res.success) {
          await respond.error(res.error);
          return;
        }
        targetVc = res.value.channel as VoiceChannel;
      } else {
        await respond.error('Usage: `vclimit [limit] [channel]`');
        return;
      }
    }

    if (!targetVc || typeof targetVc.setUserLimit !== 'function') {
      await respond.error('Invalid voice channel specified.');
      return;
    }

    const access = await checkVoiceAccess(guild.id, member, 'vclimit', targetVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    if (newLimit === null) {
      const currentLimit = targetVc.userLimit === 0 ? 'Unlimited (0)' : `${targetVc.userLimit}`;
      await respond.info(`Current user limit for **${targetVc.name}** is **${currentLimit}** (Connected: ${targetVc.members.size}).`);
      return;
    }

    if (newLimit < 0 || newLimit > 99) {
      await respond.error('User limit must be between `0` (unlimited) and `99`.');
      return;
    }

    try {
      await targetVc.setUserLimit(newLimit, `User limit updated by ${member.user.tag}`);
      const limitText = newLimit === 0 ? 'Unlimited' : `${newLimit} members`;
      await respond.success(`Set user limit for **${targetVc.name}** to **${limitText}**.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await respond.error(`Failed to update user limit: ${msg}`);
    }
  },
});

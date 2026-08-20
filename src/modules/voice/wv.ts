import type { GuildMember } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { mentionChannel } from '../../core/utils/formatters.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'wv',
  aliases: ['whichvc'],
  module: 'voice',
  description: 'Check which voice channel a user is in.',
  usage: 'wv [user]',
  examples: ['wv', 'wv @User', 'wv 123456789012345678'],
  permissions: [],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, replyTarget } = ctx;

    let targetMember: GuildMember;

    if (parsed.args.length > 0) {
      const result = await resolveUser(parsed.args.join(' '), guild);
      if (!result.success) {
        await respond.error(result.error);
        return;
      }
      if (!result.value.member) {
        await respond.error('That user is not a member of this server.');
        return;
      }
      targetMember = result.value.member;
    } else if (replyTarget) {
      targetMember = replyTarget;
    } else {
      targetMember = member;
    }

    const voiceState = targetMember.voice;
    if (!voiceState.channel) {
      await respond.send(`> **${targetMember.displayName || targetMember.user.username}** is not in a voice channel.`);
      return;
    }

    const access = await checkVoiceAccess(guild.id, member, 'wv', voiceState.channel.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const chan = voiceState.channel;
    const count = chan.members.size;
    const limit = 'userLimit' in chan && chan.userLimit && chan.userLimit > 0 ? `${chan.userLimit}` : '∞';
    const targetName = targetMember.displayName || targetMember.user.username;
    const vcInfo = `\`[ ${count}/${limit} ]\``;

    const tags: string[] = [];
    if (voiceState.streaming) tags.push('`LIVE`');
    if (voiceState.selfVideo) tags.push('`CAM`');
    if (voiceState.serverDeaf) tags.push('`SERVER-DEAF`');
    else if (voiceState.selfDeaf) tags.push('`DEAF`');
    if (voiceState.serverMute) tags.push('`SERVER-MUTE`');
    else if (voiceState.selfMute) tags.push('`MUTED`');

    const tagSuffix = tags.length > 0 ? ` ${tags.join(' ')}` : '';

    await respond.send(`**${targetName}** is in ${mentionChannel(chan.id)} ${vcInfo}${tagSuffix}`);
  },
});

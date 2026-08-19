import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'invc',
  module: 'voice',
  description: 'List all members in a voice channel with their voice states.',
  usage: 'invc [voice-channel]',
  examples: ['invc', 'invc General', 'invc 123456789012345678'],
  permitOnly: true,
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;

    let voiceChannel;

    if (parsed.args.length === 0) {
      const authorVc = member.voice.channel;
      if (!authorVc) {
        await respond.error('You are not in a voice channel. Specify a channel or join one first.');
        return;
      }
      voiceChannel = authorVc;
    } else {
      const result = resolveVoiceChannel(parsed.args.join(' '), guild);
      if (!result.success) {
        await respond.error(result.error);
        return;
      }
      voiceChannel = result.value.channel;
    }

    const access = await checkVoiceAccess(guild.id, member, 'invc', voiceChannel.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const members = voiceChannel.members;
    if (members.size === 0) {
      await respond.info(`**${voiceChannel.name}** is empty.`);
      return;
    }

    const lines: string[] = [];
    let idx = 1;
    for (const m of members.values()) {
      const tags: string[] = [];
      const vs = m.voice;
      if (vs.streaming) tags.push('`LIVE`');
      if (vs.selfVideo) tags.push('`CAM`');
      if (vs.serverDeaf) tags.push('`SERVER-DEAF`');
      else if (vs.selfDeaf) tags.push('`DEAF`');
      if (vs.serverMute) tags.push('`SERVER-MUTE`');
      else if (vs.selfMute) tags.push('`MUTED`');
      if (m.user.bot) tags.push('`BOT`');

      const tagSuffix = tags.length > 0 ? ` ${tags.join(' ')}` : '';
      lines.push(`${idx}. ${mentionUser(m.id)}${tagSuffix}`);
      idx++;
    }

    const limit = 'userLimit' in voiceChannel && voiceChannel.userLimit && voiceChannel.userLimit > 0 ? `${voiceChannel.userLimit}` : '∞';
    const bitrate = 'bitrate' in voiceChannel && voiceChannel.bitrate ? ` • ${Math.round(voiceChannel.bitrate / 1000)}kbps` : '';

    await respond.send(`**${voiceChannel.name}** \`[ ${members.size}/${limit} ]\`${bitrate}\n${lines.join('\n')}`);
  },
});

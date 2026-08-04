import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'invc',
  module: 'voice',
  description: 'List all members in a voice channel.',
  usage: 'invc [voice-channel]',
  examples: ['invc', 'invc General', 'invc 123456789012345678'],
  permitOnly: true,
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;

    let voiceChannel;

    if (parsed.args.length === 0) {
      // Use author's current voice channel
      const authorVc = member.voice.channel;
      if (!authorVc) {
        await respond.error('You are not in a voice channel. Specify a channel or join one first.');
        return;
      }
      voiceChannel = authorVc;
    } else {
      // Resolve the specified voice channel
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

    const list = members.map((m, _key, _coll) => m);
    const lines = Array.from(list.values()).map((m, i) => `${i + 1}. ${mentionUser(m.id)}`);

    await respond.send(`**${voiceChannel.name}** (${members.size} member${members.size === 1 ? '' : 's'})\n${lines.join('\n')}`);
  },
});

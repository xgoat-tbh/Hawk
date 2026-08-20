import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';
import type { GuildMember } from 'discord.js';

export default defineCommand({
  name: 'invc',
  module: 'voice',
  description: 'List all members in a voice channel with structured status groupings.',
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

    // Categorize members into structured groups
    const streamingMembers: { member: GuildMember; tags: string[] }[] = [];
    const activeMembers: { member: GuildMember; tags: string[] }[] = [];
    const mutedMembers: { member: GuildMember; tags: string[] }[] = [];

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

      if (vs.streaming || vs.selfVideo) {
        streamingMembers.push({ member: m, tags });
      } else if (vs.selfMute || vs.serverMute || vs.selfDeaf || vs.serverDeaf) {
        mutedMembers.push({ member: m, tags });
      } else {
        activeMembers.push({ member: m, tags });
      }
    }

    const sections: string[] = [];
    let counter = 1;

    if (streamingMembers.length > 0) {
      const lines = streamingMembers.map(item => {
        const tagSuffix = item.tags.length > 0 ? ` ${item.tags.join(' ')}` : '';
        return `${counter++}. **${item.member.displayName}**${tagSuffix}`;
      });
      sections.push(`**[STREAMING & VIDEO (${streamingMembers.length})]**\n${lines.join('\n')}`);
    }

    if (activeMembers.length > 0) {
      const lines = activeMembers.map(item => {
        const tagSuffix = item.tags.length > 0 ? ` ${item.tags.join(' ')}` : '';
        return `${counter++}. **${item.member.displayName}**${tagSuffix}`;
      });
      sections.push(`**[ACTIVE VOICE (${activeMembers.length})]**\n${lines.join('\n')}`);
    }

    if (mutedMembers.length > 0) {
      const lines = mutedMembers.map(item => {
        const tagSuffix = item.tags.length > 0 ? ` ${item.tags.join(' ')}` : '';
        return `${counter++}. **${item.member.displayName}**${tagSuffix}`;
      });
      sections.push(`**[MUTED / DEAFENED (${mutedMembers.length})]**\n${lines.join('\n')}`);
    }

    const limitNum = 'userLimit' in voiceChannel && voiceChannel.userLimit && voiceChannel.userLimit > 0 ? voiceChannel.userLimit : null;
    const limitStr = limitNum ? `${limitNum}` : '∞';
    const percentStr = limitNum ? ` (${Math.round((members.size / limitNum) * 100)}%)` : '';
    const bitrate = 'bitrate' in voiceChannel && voiceChannel.bitrate ? ` • ${Math.round(voiceChannel.bitrate / 1000)}kbps` : '';

    const header = `**${voiceChannel.name}** \`[ ${members.size}/${limitStr}${percentStr} ]\`${bitrate}`;
    await respond.send(`${header}\n\n${sections.join('\n\n')}`);
  },
});

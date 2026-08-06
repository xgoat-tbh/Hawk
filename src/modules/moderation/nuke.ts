import { PermissionsBitField } from 'discord.js';
import type { TextChannel, NewsChannel, VoiceChannel, StageChannel, ForumChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'nuke',
  aliases: ['clearall', 'recreatechannel', 'nukechannel'],
  module: 'moderation',
  description: 'Nuke current channel by cloning it (retaining permissions and position) and deleting the original.',
  usage: 'nuke',
  examples: ['nuke'],
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  cooldown: 10,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, channel, member, respond } = ctx;

    const targetChannel = channel as TextChannel | NewsChannel | VoiceChannel | StageChannel | ForumChannel;

    if (!targetChannel || typeof targetChannel.clone !== 'function') {
      await respond.error('Nuke can only be executed in valid server channels.');
      return;
    }

    try {
      const position = targetChannel.position;
      const clonedChannel = await targetChannel.clone({
        reason: `Channel nuked by ${member.user.tag} (${member.id})`,
      });

      await clonedChannel.setPosition(position).catch(() => {});

      const payload = buildV2Container({
        text: `💥 **Channel Nuked**\n\nThis channel was nuked by ${mentionUser(member.id)}.\nAll messages were wiped while retaining channel permissions, topic, and server position.`,
      });

      if ('send' in clonedChannel && typeof (clonedChannel as any).send === 'function') {
        const noticeMsg = await (clonedChannel as any).send(payload).catch(() => null);
        if (noticeMsg) {
          setTimeout(() => {
            noticeMsg.delete().catch(() => {});
          }, 10000);
        }
      }

      logEvent('info', 'command_execution', `Channel ${targetChannel.name} nuked by ${member.user.tag}`, {
        administrator: member.user.tag,
        adminId: member.id,
        guild: guild.name,
        guildId: guild.id,
        oldChannelId: targetChannel.id,
        newChannelId: clonedChannel.id,
      });

      await targetChannel.delete(`Channel nuked by ${member.user.tag} (${member.id})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await respond.error(`Failed to nuke channel: ${msg}`);
    }
  },
});

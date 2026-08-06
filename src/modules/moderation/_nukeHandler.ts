import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type TextChannel,
  type NewsChannel,
  type VoiceChannel,
  type StageChannel,
  type ForumChannel,
} from 'discord.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export function buildNukeConfirmationPayload(channelId: string, authorId: string) {
  const confirmBtn = new ButtonBuilder()
    .setCustomId(`nuke_confirm_${channelId}_${authorId}`)
    .setLabel('Confirm Nuke')
    .setEmoji('💥')
    .setStyle(ButtonStyle.Danger);

  const cancelBtn = new ButtonBuilder()
    .setCustomId(`nuke_cancel_${channelId}_${authorId}`)
    .setLabel('Cancel')
    .setEmoji('✖️')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

  return buildV2Container({
    text: `⚠️ **Channel Nuke Confirmation**\n\nAre you sure you want to nuke <#${channelId}>?\n\nThis will clone the channel (retaining all permissions, topic, and server position) and **permanently delete** the current channel and all its messages.`,
    components: [row],
  });
}

export async function handleNukeInteraction(interaction: ButtonInteraction): Promise<void> {
  const { customId, user, guild, channel } = interaction;
  if (!customId.startsWith('nuke_') || !guild || !channel) return;

  const parts = customId.split('_');
  const action = parts[1]; // 'confirm' or 'cancel'
  const invokerId = parts[3];

  if (user.id !== invokerId) {
    await interaction.reply({
      content: 'Only the command invoker can confirm or cancel this channel nuke request.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === 'cancel') {
    const cancelPayload = buildV2Container({
      text: '⚪ **Nuke Cancelled**\n\nThe channel nuke operation was cancelled.',
    });
    await interaction.update(cancelPayload);
    setTimeout(() => {
      interaction.message.delete().catch(() => {});
    }, 5000);
    return;
  }

  if (action === 'confirm') {
    const targetChannel = channel as TextChannel | NewsChannel | VoiceChannel | StageChannel | ForumChannel;

    if (!targetChannel || typeof targetChannel.clone !== 'function') {
      await interaction.update({
        content: 'Failed to nuke channel: invalid or unsupported channel type.',
        components: [],
      });
      return;
    }

    try {
      const position = targetChannel.position;

      const clonedChannel = await targetChannel.clone({
        reason: `Channel nuked by ${user.tag} (${user.id})`,
      });

      await clonedChannel.setPosition(position).catch(() => {});

      const noticePayload = buildV2Container({
        text: `💥 **Channel Nuked**\n\nThis channel was nuked by ${mentionUser(user.id)}.\nAll messages were wiped while retaining channel permissions, topic, and server position.`,
      });

      if ('send' in clonedChannel && typeof (clonedChannel as any).send === 'function') {
        const noticeMsg = await (clonedChannel as any).send(noticePayload).catch(() => null);
        if (noticeMsg) {
          setTimeout(() => {
            noticeMsg.delete().catch(() => {});
          }, 10000);
        }
      }

      logEvent('info', 'command_execution', `Channel ${targetChannel.name} nuked by ${user.tag}`, {
        administrator: user.tag,
        adminId: user.id,
        guild: guild.name,
        guildId: guild.id,
        oldChannelId: targetChannel.id,
        newChannelId: clonedChannel.id,
      });

      await targetChannel.delete(`Channel nuked by ${user.tag} (${user.id})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await interaction.followUp({
        content: `Failed to execute channel nuke: ${msg}`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
}

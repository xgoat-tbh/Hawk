import {
  PermissionsBitField,
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
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';
import * as permissionRepo from '../../core/database/repositories/permissionRepo.js';

export function buildNukeConfirmationPayload(channelId: string, authorId: string) {
  const confirmBtn = new ButtonBuilder()
    .setCustomId(`nuke_confirm_${channelId}_${authorId}`)
    .setLabel('Confirm Nuke')
    .setStyle(ButtonStyle.Danger);

  const cancelBtn = new ButtonBuilder()
    .setCustomId(`nuke_cancel_${channelId}_${authorId}`)
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

  return buildV2Container({
    text:
      `# Channel Nuke Confirmation\n\n` +
      `> Are you sure you want to nuke <#${channelId}>?\n\n` +
      `• **Target Channel:** <#${channelId}>\n` +
      `• **Consequence:** Clones the channel (retaining permissions, topic, and position) and **permanently deletes** the current channel and all message history.`,
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

  const member = interaction.member;
  const authority = getAuthorityLevel(user.id, guild.ownerId);
  const isAdministrator =
    member &&
    'permissions' in member &&
    (member.permissions as Readonly<PermissionsBitField>).has(PermissionsBitField.Flags.Administrator);

  let memberRoleIds: string[] = [];
  if (member && 'roles' in member) {
    if ('cache' in member.roles) {
      memberRoleIds = Array.from((member.roles as any).cache.keys());
    } else if (Array.isArray(member.roles)) {
      memberRoleIds = member.roles as string[];
    }
  }

  const hasPermit = await permissionRepo.hasPermit(guild.id, user.id, memberRoleIds, 'nuke', 'moderation');

  if (authority < AuthorityLevel.ServerAdmin && !isAdministrator && !hasPermit) {
    await interaction.reply({
      content: 'You must have Administrator permission or a valid permit to execute a channel nuke.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === 'cancel') {
    const cancelPayload = buildV2Container({
      text: '### Operation Cancelled\n> The channel nuke request was safely cancelled.',
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
        text:
          `### Channel Nuked\n` +
          `> This channel was recreated and cleared by ${mentionUser(user.id)}.\n` +
          `• All messages were wiped while retaining channel permissions, topic, and position.`,
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

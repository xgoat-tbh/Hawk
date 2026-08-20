import {
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type VoiceBasedChannel,
} from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export async function handleVclockUnlockButton(interaction: ButtonInteraction): Promise<void> {
  const parts = interaction.customId.split('_');
  // customId format: vclock_unlock_<vcId>_<invokerId>
  const vcId = parts[2];
  const invokerId = parts[3];

  if (interaction.user.id !== invokerId) {
    await interaction.reply({
      content: 'Only the moderator who locked the channel can use this quick unlock button.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guild = interaction.guild;
  if (!guild) return;

  const vc = guild.channels.cache.get(vcId) as VoiceBasedChannel | null;
  if (!vc) {
    await interaction.reply({ content: 'Voice channel no longer exists.', flags: MessageFlags.Ephemeral });
    return;
  }

  const everyoneRole = guild.roles.everyone;
  await vc.permissionOverwrites.edit(everyoneRole.id, {
    Connect: null,
    ViewChannel: null,
  }).catch(() => {});

  await interaction.update({
    content: `> Unlocked and unblinded voice channel ${mentionChannel(vc.id)}. *(Auto-deleting in 5s)*`,
    components: [],
  }).catch(() => {});

  logAuditAction({
    guild,
    action: 'Voice Channel Quick-Unlocked',
    executor: interaction.member as any,
    channelName: vc.name,
    details: `• **Channel:** \`${vc.name}\` (${vc.id})`,
  });

  setTimeout(() => {
    interaction.message.delete().catch(() => {});
  }, 5000);
}

export default defineCommand({
  name: 'vclock',
  aliases: ['vcblind', 'vcunlock'],
  module: 'voice',
  description: 'Lock or blind a voice channel by toggling Connect or ViewChannel permissions for everyone.',
  usage: 'vclock [voice_channel] | vcblind [voice_channel]',
  examples: ['vclock', 'vcblind "Gaming Lounge"', 'vclock blind "Staff VC"', 'vcunlock'],
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, channel } = ctx;

    const isBlindAlias = parsed.aliasUsed.toLowerCase() === 'vcblind';
    const isUnlockAlias = parsed.aliasUsed.toLowerCase() === 'vcunlock';

    let isBlindMode = isBlindAlias;
    let isUnlockMode = isUnlockAlias;
    let targetArgIndex = 0;

    if (parsed.args.length > 0 && !isBlindAlias && !isUnlockAlias) {
      const firstWord = parsed.args[0].toLowerCase();
      if (firstWord === 'blind') {
        isBlindMode = true;
        targetArgIndex = 1;
      } else if (firstWord === 'unlock' || firstWord === 'open') {
        isUnlockMode = true;
        targetArgIndex = 1;
      }
    }

    let targetVc: VoiceBasedChannel | null = member.voice.channel as VoiceBasedChannel | null;

    if (parsed.args.length > targetArgIndex) {
      const targetQuery = parsed.args.slice(targetArgIndex).join(' ');
      const res = resolveVoiceChannel(targetQuery, guild);
      if (!res.success) {
        await respond.error(`Voice Channel: ${res.error}`);
        return;
      }
      targetVc = res.value.channel as VoiceBasedChannel;
    }

    if (!targetVc) {
      await respond.error('You must be connected to a voice channel or specify a target voice channel.');
      return;
    }

    // Voice Access Policy check for vconfig
    const access = await checkVoiceAccess(guild.id, member, 'vclock', targetVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const everyoneRole = guild.roles.everyone;
    const currentOverwrite = targetVc.permissionOverwrites.cache.get(everyoneRole.id);

    if (isUnlockMode) {
      // Unlock & Unblind
      await targetVc.permissionOverwrites.edit(everyoneRole.id, {
        Connect: null,
        ViewChannel: null,
      });
      await respond.transientSuccess(`Unlocked and unblinded voice channel ${mentionChannel(targetVc.id)}. *(Auto-deleting in 5s)*`, 5000);
      logAuditAction({
        guild,
        action: 'Voice Channel Unlocked',
        executor: member,
        channelName: targetVc.name,
        details: `• **Channel:** \`${targetVc.name}\` (${targetVc.id})`,
      });
    } else if (isBlindMode) {
      // Blind & Lock
      const isCurrentlyBlind = currentOverwrite?.deny.has(PermissionsBitField.Flags.ViewChannel) ?? false;
      if (isCurrentlyBlind) {
        await targetVc.permissionOverwrites.edit(everyoneRole.id, {
          Connect: null,
          ViewChannel: null,
        });
        await respond.transientSuccess(`Unblinded voice channel ${mentionChannel(targetVc.id)}. *(Auto-deleting in 5s)*`, 5000);
        logAuditAction({
          guild,
          action: 'Voice Channel Unblinded',
          executor: member,
          channelName: targetVc.name,
        });
      } else {
        await targetVc.permissionOverwrites.edit(everyoneRole.id, {
          Connect: false,
          ViewChannel: false,
        });

        const unlockBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`vclock_unlock_${targetVc.id}_${member.id}`)
            .setLabel('Unlock Channel')
            .setStyle(ButtonStyle.Secondary),
        );

        const msg = await (channel as any).send({
          content: `> Blinded and locked voice channel ${mentionChannel(targetVc.id)}.`,
          components: [unlockBtn],
        });
        setTimeout(() => msg.delete().catch(() => {}), 15000);

        logAuditAction({
          guild,
          action: 'Voice Channel Blinded & Locked',
          executor: member,
          channelName: targetVc.name,
        });
      }
    } else {
      // Lock / Unlock Connect toggle
      const isCurrentlyLocked = currentOverwrite?.deny.has(PermissionsBitField.Flags.Connect) ?? false;
      if (isCurrentlyLocked) {
        await targetVc.permissionOverwrites.edit(everyoneRole.id, { Connect: null });
        await respond.transientSuccess(`Unlocked voice channel ${mentionChannel(targetVc.id)}. *(Auto-deleting in 5s)*`, 5000);
        logAuditAction({
          guild,
          action: 'Voice Channel Unlocked',
          executor: member,
          channelName: targetVc.name,
        });
      } else {
        await targetVc.permissionOverwrites.edit(everyoneRole.id, { Connect: false });

        const unlockBtn = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`vclock_unlock_${targetVc.id}_${member.id}`)
            .setLabel('Unlock Channel')
            .setStyle(ButtonStyle.Secondary),
        );

        const msg = await (channel as any).send({
          content: `> Locked voice channel ${mentionChannel(targetVc.id)}.`,
          components: [unlockBtn],
        });
        setTimeout(() => msg.delete().catch(() => {}), 15000);

        logAuditAction({
          guild,
          action: 'Voice Channel Locked',
          executor: member,
          channelName: targetVc.name,
        });
      }
    }

    logEvent('info', 'command_execution', `Voice channel lock/blind toggled by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      vc: targetVc.name,
      vcId: targetVc.id,
      mode: isUnlockMode ? 'unlock' : isBlindMode ? 'blind' : 'lock',
    });
  },
});

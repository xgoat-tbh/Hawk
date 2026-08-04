import { PermissionsBitField } from 'discord.js';
import type { VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

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
    const { parsed, guild, member, respond } = ctx;

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
      await respond.success(`Unlocked and unblinded voice channel ${mentionChannel(targetVc.id)}.`);
    } else if (isBlindMode) {
      // Blind & Lock
      const isCurrentlyBlind = currentOverwrite?.deny.has(PermissionsBitField.Flags.ViewChannel) ?? false;
      if (isCurrentlyBlind) {
        await targetVc.permissionOverwrites.edit(everyoneRole.id, {
          Connect: null,
          ViewChannel: null,
        });
        await respond.success(`Unblinded voice channel ${mentionChannel(targetVc.id)}.`);
      } else {
        await targetVc.permissionOverwrites.edit(everyoneRole.id, {
          Connect: false,
          ViewChannel: false,
        });
        await respond.success(`Blinded and locked voice channel ${mentionChannel(targetVc.id)}.`);
      }
    } else {
      // Lock / Unlock Connect toggle
      const isCurrentlyLocked = currentOverwrite?.deny.has(PermissionsBitField.Flags.Connect) ?? false;
      if (isCurrentlyLocked) {
        await targetVc.permissionOverwrites.edit(everyoneRole.id, { Connect: null });
        await respond.success(`Unlocked voice channel ${mentionChannel(targetVc.id)}.`);
      } else {
        await targetVc.permissionOverwrites.edit(everyoneRole.id, { Connect: false });
        await respond.success(`Locked voice channel ${mentionChannel(targetVc.id)}.`);
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

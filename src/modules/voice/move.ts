import { PermissionsBitField } from 'discord.js';
import type { GuildMember } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'move',
  module: 'voice',
  description: 'Move a user to a voice channel or to another user\'s voice channel.',
  usage: 'move <user> <destination> OR reply with move <destination>',
  examples: ['move @User General', 'move @UserA @UserB'],
  permissions: [PermissionsBitField.Flags.MoveMembers],
  botPermissions: [PermissionsBitField.Flags.MoveMembers],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, replyTarget } = ctx;

    let targetMember: GuildMember;
    let destInput: string;

    if (parsed.args.length >= 2) {
      const targetResult = await resolveUser(parsed.args[0], guild);
      if (!targetResult.success) {
        await respond.error(`Target: ${targetResult.error}`);
        return;
      }
      if (!targetResult.value.member) {
        await respond.error('Target user is not a member of this server.');
        return;
      }
      targetMember = targetResult.value.member;
      destInput = parsed.args.slice(1).join(' ');
    } else if (parsed.args.length >= 1 && replyTarget) {
      targetMember = replyTarget;
      destInput = parsed.args.join(' ');
    } else {
      await respond.error('Usage: `move <user> <destination>` or reply to a message with `move <destination>`');
      return;
    }

    if (!targetMember.voice.channel) {
      await respond.error(`${mentionUser(targetMember.id)} is not in a voice channel.`);
      return;
    }

    // Try resolving as a user first
    const destUserResult = await resolveUser(destInput, guild);
    if (destUserResult.success && destUserResult.value.member) {
      const destMember = destUserResult.value.member;
      if (!destMember.voice.channel) {
        await respond.error(`${mentionUser(destMember.id)} is not in a voice channel.`);
        return;
      }

      const destVc = destMember.voice.channel;
      const botMember = guild.members.me;
      if (botMember && !destVc.permissionsFor(botMember).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.MoveMembers])) {
        await respond.error(`I lack permission to move members into **${destVc.name}**.`);
        return;
      }

      const access = await checkVoiceAccess(guild.id, member, 'move', destVc.id);
      if (!access.allowed) {
        await respond.denied(access.reason || 'Voice command access denied.');
        return;
      }

      if (targetMember.voice.channelId === destVc.id) {
        await respond.info(`${mentionUser(targetMember.id)} is already in **${destVc.name}**.`);
        return;
      }

      try {
        await targetMember.voice.setChannel(destVc);
        await respond.success(`Moved ${mentionUser(targetMember.id)} to **${destVc.name}**`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        consoleLog('error', 'command_failure', `move: failed to move ${targetMember.id}`, { error: msg });
        await respond.error(`Could not move ${mentionUser(targetMember.id)}.`);
      }
      return;
    }

    // Fall back to voice channel resolution
    const destVcResult = resolveVoiceChannel(destInput, guild);
    if (!destVcResult.success) {
      await respond.error(`Destination: ${destVcResult.error}`);
      return;
    }

    const destVc = destVcResult.value.channel;
    const botMember = guild.members.me;
    if (botMember && !destVc.permissionsFor(botMember).has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.MoveMembers])) {
      await respond.error(`I lack permission to move members into **${destVc.name}**.`);
      return;
    }

    const access = await checkVoiceAccess(guild.id, member, 'move', destVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    if (targetMember.voice.channelId === destVc.id) {
      await respond.info(`${mentionUser(targetMember.id)} is already in **${destVc.name}**.`);
      return;
    }

    try {
      await targetMember.voice.setChannel(destVc);
      await respond.success(`Moved ${mentionUser(targetMember.id)} to **${destVc.name}**`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      consoleLog('error', 'command_failure', `move: failed to move ${targetMember.id}`, { error: msg });
      await respond.error(`Could not move ${mentionUser(targetMember.id)}.`);
    }
  },
});

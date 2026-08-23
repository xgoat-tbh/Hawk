import { PermissionsBitField } from 'discord.js';
import type { GuildMember, VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'move',
  aliases: ['multimove', 'mmv'],
  module: 'voice',
  description: 'Move a user or multiple users to a voice channel or to another user\'s voice channel.',
  usage: 'move <users...> <destination> OR reply with move [users...] <destination>',
  examples: ['move @User General', 'move @UserA @UserB General', 'move @UserA @UserB @UserC'],
  permissions: [PermissionsBitField.Flags.MoveMembers],
  botPermissions: [PermissionsBitField.Flags.MoveMembers],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, replyTarget } = ctx;

    const rawArgs = parsed.args;
    if (rawArgs.length === 0 && !replyTarget) {
      await respond.error('Usage: `move <users...> <destination>` or reply to a message with `move [users...] <destination>`');
      return;
    }

    const rawTargetMembers: GuildMember[] = [];
    if (replyTarget) {
      rawTargetMembers.push(replyTarget);
    }

    let destInput = '';

    if (rawArgs.length === 1 && replyTarget) {
      destInput = rawArgs[0];
    } else if (rawArgs.length >= 1) {
      let destIndex = rawArgs.length - 1;
      for (let i = 0; i < rawArgs.length - 1; i++) {
        const res = await resolveUser(rawArgs[i], guild);
        if (res.success && res.value.member) {
          rawTargetMembers.push(res.value.member);
        } else {
          destIndex = i;
          break;
        }
      }
      destInput = rawArgs.slice(destIndex).join(' ');
    }

    // Deduplicate target members while preserving order
    const targetMembers: GuildMember[] = [];
    const seenIds = new Set<string>();
    for (const m of rawTargetMembers) {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        targetMembers.push(m);
      }
    }

    if (targetMembers.length === 0 || !destInput) {
      await respond.error('Usage: `move <users...> <destination>` or reply to a message with `move [users...] <destination>`');
      return;
    }

    // Resolve destination — try user first, then voice channel
    let destVc: VoiceBasedChannel;

    const destUserResult = await resolveUser(destInput, guild);
    if (destUserResult.success && destUserResult.value.member) {
      const destMember = destUserResult.value.member;
      if (!destMember.voice.channel) {
        await respond.error(`${mentionUser(destMember.id)} is not in a voice channel.`);
        return;
      }
      destVc = destMember.voice.channel;
    } else {
      const destVcResult = resolveVoiceChannel(destInput, guild);
      if (!destVcResult.success) {
        await respond.error(`Destination: ${destVcResult.error}`);
        return;
      }
      destVc = destVcResult.value.channel;
    }

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

    const successes: string[] = [];
    const failures: string[] = [];

    const CHUNK_SIZE = 5;
    for (let i = 0; i < targetMembers.length; i += CHUNK_SIZE) {
      const chunk = targetMembers.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (targetMember) => {
          if (!targetMember.voice.channel) {
            failures.push(targetMembers.length === 1 ? `${mentionUser(targetMember.id)} is not in a voice channel.` : `${mentionUser(targetMember.id)} (not in VC)`);
            return;
          }
          if (targetMember.voice.channelId === destVc.id) {
            failures.push(targetMembers.length === 1 ? `${mentionUser(targetMember.id)} is already in **${destVc.name}**.` : `${mentionUser(targetMember.id)} (already in VC)`);
            return;
          }
          try {
            await targetMember.voice.setChannel(destVc);
            successes.push(mentionUser(targetMember.id));
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            consoleLog('error', 'command_failure', `move: failed to move ${targetMember.id}`, { error: msg });
            failures.push(targetMembers.length === 1 ? `Could not move ${mentionUser(targetMember.id)}.` : `${mentionUser(targetMember.id)} (failed)`);
          }
        })
      );
    }

    if (successes.length > 0 && failures.length === 0) {
      await respond.success(`Moved ${successes.join(', ')} to **${destVc.name}**.`);
    } else if (successes.length > 0 && failures.length > 0) {
      await respond.send(`> Moved ${successes.join(', ')} to **${destVc.name}**.\n> **Notice:** Could not move: ${failures.join(', ')}`);
    } else if (failures.length === 1 && !failures[0].includes('(')) {
      await respond.error(failures[0]);
    } else {
      await respond.error(`Could not move: ${failures.join(', ')}`);
    }
  },
});

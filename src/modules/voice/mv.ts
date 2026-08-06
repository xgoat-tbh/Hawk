import { PermissionsBitField } from 'discord.js';
import type { GuildMember } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'mv',
  aliases: ['pull'],
  module: 'voice',
  description: 'Move multiple users to your current voice channel.',
  usage: 'mv <users...>',
  examples: ['mv @UserA @UserB', 'mv @UserA @UserB @UserC'],
  permissions: [PermissionsBitField.Flags.MoveMembers],
  botPermissions: [PermissionsBitField.Flags.MoveMembers],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, replyTarget } = ctx;

    const authorVc = member.voice.channel;
    if (!authorVc) {
      await respond.error('You must be in a voice channel to use this command.');
      return;
    }

    const access = await checkVoiceAccess(guild.id, member, 'mv', authorVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const successes: string[] = [];
    const failures: string[] = [];

    const targetMembers: GuildMember[] = [];

    if (parsed.args.length > 0) {
      for (const arg of parsed.args) {
        const result = await resolveUser(arg, guild);
        if (!result.success) {
          failures.push(`\`${arg}\`: ${result.error}`);
        } else if (result.value.member) {
          targetMembers.push(result.value.member);
        } else {
          failures.push(`\`${arg}\`: not in this server`);
        }
      }
    } else if (replyTarget) {
      targetMembers.push(replyTarget);
    }

    if (targetMembers.length === 0 && failures.length === 0) {
      await respond.error('Specify at least one user to move, or reply to a user\'s message.');
      return;
    }

    for (const targetMember of targetMembers) {
      if (!targetMember.voice.channel) {
        failures.push(`${mentionUser(targetMember.id)}: not in a voice channel`);
        continue;
      }

      if (targetMember.voice.channelId === authorVc.id) {
        failures.push(`${mentionUser(targetMember.id)}: already in your channel`);
        continue;
      }

      try {
        await targetMember.voice.setChannel(authorVc);
        successes.push(mentionUser(targetMember.id));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        consoleLog('error', 'command_failure', `mv: failed to move ${targetMember.id}`, { error: msg });
        failures.push(`${mentionUser(targetMember.id)}: could not move`);
      }
    }

    const parts: string[] = [];
    if (successes.length > 0) {
      parts.push(`Moved ${successes.join(', ')} to **${authorVc.name}**`);
    }
    if (failures.length > 0) {
      parts.push(`Failed:\n${failures.join('\n')}`);
    }

    if (successes.length > 0 && failures.length === 0) {
      await respond.success(parts.join('\n'));
    } else if (successes.length > 0 && failures.length > 0) {
      await respond.warning(parts.join('\n\n'));
    } else {
      await respond.error(parts.join('\n'));
    }
  },
});

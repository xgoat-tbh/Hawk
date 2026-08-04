import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';
import type { VoiceBasedChannel } from 'discord.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'multimove',
  module: 'voice',
  description: 'Move multiple users to a specified destination.',
  usage: 'multimove <users...> <destination>',
  examples: ['multimove @UserA @UserB General', 'multimove @UserA @UserB @UserC @DestUser'],
  permissions: [PermissionsBitField.Flags.MoveMembers],
  botPermissions: [PermissionsBitField.Flags.MoveMembers],
  cooldown: 5,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;

    if (parsed.args.length < 2) {
      await respond.error('Usage: `multimove <users...> <destination>`');
      return;
    }

    // Last arg is the destination, all preceding are targets
    const destInput = parsed.args[parsed.args.length - 1];
    const targetInputs = parsed.args.slice(0, -1);

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

    const access = await checkVoiceAccess(guild.id, member, 'multimove', destVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const successes: string[] = [];
    const failures: string[] = [];

    for (const arg of targetInputs) {
      const result = await resolveUser(arg, guild);
      if (!result.success) {
        failures.push(`\`${arg}\`: ${result.error}`);
        continue;
      }

      const target = result.value;
      const targetMember = target.member;
      if (!targetMember) {
        failures.push(`${mentionUser(target.id)}: not in this server`);
        continue;
      }

      if (!targetMember.voice.channel) {
        failures.push(`${mentionUser(target.id)}: not in a voice channel`);
        continue;
      }

      if (targetMember.voice.channelId === destVc.id) {
        failures.push(`${mentionUser(target.id)}: already in destination`);
        continue;
      }

      try {
        await targetMember.voice.setChannel(destVc);
        successes.push(mentionUser(target.id));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        consoleLog('error', 'command_failure', `multimove: failed to move ${target.id}`, { error: msg });
        failures.push(`${mentionUser(target.id)}: could not move`);
      }
    }

    const parts: string[] = [];
    if (successes.length > 0) {
      parts.push(`Moved ${successes.join(', ')} to **${destVc.name}**`);
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

import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'shiftvc',
  aliases: ['moveall', 'svc'],
  module: 'voice',
  description: 'Move all members from one voice channel to another.',
  usage: 'shiftvc <destination> OR shiftvc <source>, <destination>',
  examples: ['shiftvc General', 'shiftvc Management VC, Hangout 5'],
  permissions: [PermissionsBitField.Flags.MoveMembers],
  botPermissions: [PermissionsBitField.Flags.MoveMembers],
  cooldown: 10,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond } = ctx;

    // Use rawArgs to preserve spaces in channel names
    const rawArgs = parsed.rawArgs.trim();

    if (!rawArgs) {
      await respond.error('Usage: `shiftvc <destination>` or `shiftvc <source>, <destination>`');
      return;
    }

    let sourceVc;
    let destVc;

    // Check for comma separator
    const commaIndex = rawArgs.indexOf(',');

    if (commaIndex === -1) {
      // ── Single argument: destination only ──────────────────
      // Source = author's current VC
      if (!member.voice.channel) {
        await respond.error('You must be in a voice channel, or specify both source and destination.\nUsage: `shiftvc <source>, <destination>`');
        return;
      }
      sourceVc = member.voice.channel;

      const destResult = resolveVoiceChannel(rawArgs, guild);
      if (!destResult.success) {
        await respond.error(`Destination: ${destResult.error}`);
        return;
      }
      destVc = destResult.value.channel;
    } else {
      // ── Two arguments: source, destination ─────────────────
      // Reject multiple commas
      if (rawArgs.indexOf(',', commaIndex + 1) !== -1) {
        await respond.error('Too many commas. Usage: `shiftvc <source>, <destination>`');
        return;
      }

      const sourceInput = rawArgs.slice(0, commaIndex).trim();
      const destInput = rawArgs.slice(commaIndex + 1).trim();

      if (!sourceInput) {
        await respond.error('Missing source channel. Usage: `shiftvc <source>, <destination>`');
        return;
      }

      if (!destInput) {
        await respond.error('Missing destination channel. Usage: `shiftvc <source>, <destination>`');
        return;
      }

      // Resolve both before moving anyone
      const sourceResult = resolveVoiceChannel(sourceInput, guild);
      if (!sourceResult.success) {
        await respond.error(`Source: ${sourceResult.error}`);
        return;
      }
      sourceVc = sourceResult.value.channel;

      const destResult = resolveVoiceChannel(destInput, guild);
      if (!destResult.success) {
        await respond.error(`Destination: ${destResult.error}`);
        return;
      }
      destVc = destResult.value.channel;
    }

    // ── Validation (before any moves) ────────────────────────

    if (sourceVc.id === destVc.id) {
      await respond.error('Source and destination cannot be the same channel.');
      return;
    }

    // Voice Access Evaluation for BOTH source and destination voice channels
    const access = await checkVoiceAccess(guild.id, member, 'shiftvc', destVc.id, sourceVc.id);
    if (!access.allowed) {
      await respond.denied(access.reason || 'Voice command access denied.');
      return;
    }

    const members = sourceVc.members;
    if (members.size === 0) {
      await respond.info(`**${sourceVc.name}** is empty.`);
      return;
    }

    // ── Execute moves ────────────────────────────────────────

    let moved = 0;
    const failures: string[] = [];

    for (const [, m] of members) {
      try {
        await m.voice.setChannel(destVc);
        moved++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        consoleLog('error', 'command_failure', `shiftvc: failed to move ${m.id}`, { error: msg });
        failures.push(mentionUser(m.id));
      }
    }

    const parts: string[] = [];
    if (moved > 0) {
      parts.push(`Moved **${moved}** member${moved === 1 ? '' : 's'} from **${sourceVc.name}** to **${destVc.name}**`);
    }
    if (failures.length > 0) {
      parts.push(`Could not move: ${failures.join(', ')}`);
    }

    if (moved > 0 && failures.length === 0) {
      await respond.success(parts.join('\n'));
    } else if (moved > 0 && failures.length > 0) {
      await respond.warning(parts.join('\n'));
    } else {
      await respond.error(parts.join('\n'));
    }
  },
});

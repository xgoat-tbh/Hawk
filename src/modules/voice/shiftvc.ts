import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel, Message } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { formatUser } from '../../core/utils/formatters.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';
import { ui } from '../../core/ui/index.js';
import { LiveProgressTracker, renderProgressBar } from '../../core/utils/ProgressBar.js';
import { presenceManager } from '../../core/presence/PresenceManager.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';

export default defineCommand({
  name: 'shiftvc',
  aliases: ['moveall', 'svc'],
  module: 'voice',
  description: 'Move all members from one voice channel to another with live tracking.',
  usage: 'shiftvc <destination> OR shiftvc <source>, <destination>',
  examples: ['shiftvc General', 'shiftvc Management VC, Hangout 5'],
  permissions: [PermissionsBitField.Flags.MoveMembers],
  botPermissions: [PermissionsBitField.Flags.MoveMembers],
  cooldown: 5,

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

    const membersList = Array.from(sourceVc.members.values());
    const totalMembers = membersList.length;

    if (totalMembers === 0) {
      await respond.info(`**${sourceVc.name}** is empty.`);
      return;
    }

    // ── Execute moves with Live Progress Bar ────────────────────────

    let statusMsg: Message | null = null;
    let tracker: LiveProgressTracker | null = null;

    if (totalMembers > 3) {
      const initialPayload = ui.standard({
        title: `Shifting Voice Members (${sourceVc.name} -> ${destVc.name})`,
        text: `Target: ${totalMembers} members\n**Progress:** ${renderProgressBar(0, totalMembers)} (0/${totalMembers})\nMoved: **0** | Failed: **0**`,
      });
      statusMsg = await (ctx.channel as GuildTextBasedChannel).send({ components: initialPayload.components, flags: initialPayload.flags as any }).catch(() => null);
      if (statusMsg) {
        tracker = new LiveProgressTracker(statusMsg, `ShiftVC (${sourceVc.name} -> ${destVc.name})`, totalMembers);
      }
    }

    const taskId = `shiftvc_${guild.id}_${Date.now()}`;
    presenceManager.setBusy(taskId, `Shifting ${totalMembers} members`);

    let moved = 0;
    const failures: string[] = [];

    let processed = 0;
    try {
      for (const m of membersList) {
        try {
          await m.voice.setChannel(destVc);
          moved++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          consoleLog('error', 'command_failure', `shiftvc: failed to move ${m.id}`, { error: msg });
          failures.push(formatUser(m, guild));
        }
        processed++;
        if (tracker) {
          await tracker.update(processed, `Moved: **${moved}** | Failed: **${failures.length}**`);
        }
      }

      if (tracker) {
        await tracker.update(totalMembers, `Moved: **${moved}** | Failed: **${failures.length}**`, true);
      }
    } finally {
      presenceManager.clearBusy(taskId);
    }

    const parts: string[] = [
      `• **Transferred:** **${moved}** / **${totalMembers}** members`,
      `• **From:** \`${sourceVc.name}\` -> **To:** \`${destVc.name}\``,
    ];
    if (failures.length > 0) {
      parts.push(`• **Failed:** ${failures.join(', ')}`);
    }

    if (statusMsg) {
      const finalPayload = ui.standard({
        title: 'Voice Transfer Completed',
        text: parts.join('\n') + '\n\n• *(Auto-deleting in 8s)*',
      });
      await statusMsg.edit({ components: finalPayload.components, flags: finalPayload.flags as any }).catch(() => {});
      setTimeout(() => {
        statusMsg?.delete().catch(() => {});
      }, 8000);
    } else {
      if (moved > 0 && failures.length === 0) {
        await respond.transientSuccess(`Moved **${moved}** member(s) from **${sourceVc.name}** to **${destVc.name}**. *(Auto-deleting in 5s)*`, 5000);
      } else if (moved > 0 && failures.length > 0) {
        await respond.warning(parts.join('\n'));
      } else {
        await respond.error(parts.join('\n'));
      }
    }

    logAuditAction({
      guild,
      action: 'Voice Channel Shift Executed',
      executor: member,
      details: [
        `• **Source:** \`${sourceVc.name}\` (${sourceVc.id})`,
        `• **Destination:** \`${destVc.name}\` (${destVc.id})`,
        `• **Moved:** ${moved} / ${totalMembers} members`,
      ],
    });
  },
});

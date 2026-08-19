import { PermissionsBitField } from 'discord.js';
import type { GuildMember } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';

export default defineCommand({
  name: 'vckick',
  aliases: ['dckick', 'vcdc', 'disconnect'],
  module: 'voice',
  description: 'Disconnect a user or multiple users from their voice channel.',
  usage: 'vckick <users...> OR reply with vckick [users...]',
  examples: ['vckick @User', 'vckick @UserA @UserB'],
  permissions: [PermissionsBitField.Flags.MoveMembers],
  botPermissions: [PermissionsBitField.Flags.MoveMembers],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, replyTarget } = ctx;

    const rawTargetMembers: GuildMember[] = [];
    if (replyTarget) {
      rawTargetMembers.push(replyTarget);
    }

    if (parsed.args.length > 0) {
      for (const arg of parsed.args) {
        const res = await resolveUser(arg, guild);
        if (res.success && res.value.member) {
          rawTargetMembers.push(res.value.member);
        }
      }
    }

    // Deduplicate target members
    const targetMembers: GuildMember[] = [];
    const seenIds = new Set<string>();
    for (const m of rawTargetMembers) {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        targetMembers.push(m);
      }
    }

    if (targetMembers.length === 0) {
      await respond.error('Specify at least one user to disconnect from voice, or reply to a message.');
      return;
    }

    const successes: string[] = [];
    const failures: string[] = [];

    for (const target of targetMembers) {
      const targetVc = target.voice.channel;
      if (!targetVc) {
        failures.push(targetMembers.length === 1 ? `${mentionUser(target.id)} is not in a voice channel.` : `${mentionUser(target.id)} (not in VC)`);
        continue;
      }

      const access = await checkVoiceAccess(guild.id, member, 'vckick', targetVc.id);
      if (!access.allowed) {
        failures.push(targetMembers.length === 1 ? `Access denied for ${mentionUser(target.id)}: ${access.reason || 'Voice restricted.'}` : `${mentionUser(target.id)} (restricted)`);
        continue;
      }

      try {
        await target.voice.disconnect('Voice kick requested by moderator');
        successes.push(mentionUser(target.id));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        consoleLog('error', 'command_failure', `vckick: failed to disconnect ${target.id}`, { error: msg });
        failures.push(targetMembers.length === 1 ? `Could not disconnect ${mentionUser(target.id)}.` : `${mentionUser(target.id)} (failed)`);
      }
    }

    if (successes.length > 0 && failures.length === 0) {
      await respond.success(`Disconnected ${successes.join(', ')} from voice.`);
    } else if (successes.length > 0 && failures.length > 0) {
      await respond.send(`> Disconnected ${successes.join(', ')} from voice.\n> **Notice:** Could not disconnect: ${failures.join(', ')}`);
    } else if (failures.length === 1 && !failures[0].includes('(')) {
      await respond.error(failures[0]);
    } else {
      await respond.error(`Could not disconnect: ${failures.join(', ')}`);
    }
  },
});

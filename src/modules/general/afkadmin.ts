import { PermissionsBitField } from 'discord.js';
import type { GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import {
  getAfkEntriesForGuild,
  clearAllAfkRecords,
} from '../../core/database/repositories/afkRepo.js';
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';
import { ui } from '../../core/ui/index.js';
import { mentionUser, timestamp } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'afkadmin',
  aliases: ['afklist', 'afkreset'],
  module: 'general',
  description: 'View active AFK members list or reset all server AFK records (Bot Owner only).',
  usage: 'afkadmin list | afkadmin reset',
  examples: ['afkadmin list', 'afkadmin reset', 'afklist', 'afkreset'],
  permissions: [PermissionsBitField.Flags.ManageGuild],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, channel, respond } = ctx;

    const aliasUsed = parsed.aliasUsed.toLowerCase();
    let sub = parsed.args[0]?.toLowerCase() ?? 'list';

    if (aliasUsed === 'afkreset') {
      sub = 'reset';
    } else if (aliasUsed === 'afklist') {
      sub = 'list';
    }

    // ── Subcommand: reset (Bot Owner ONLY) ───────────────────
    if (sub === 'reset' || sub === 'clear') {
      const authority = getAuthorityLevel(member.id, guild.ownerId);
      if (authority !== AuthorityLevel.Owner) {
        await respond.error('Only the **Bot Owner** can reset all server AFK records.');
        return;
      }

      await clearAllAfkRecords(guild.id);
      await respond.success('Successfully cleared all AFK records and reset AFK cache for this server.');

      logEvent('info', 'command_execution', `Server AFK cache reset by ${member.user.tag}`, {
        executor: member.user.tag,
        executorId: member.id,
        guild: guild.name,
        guildId: guild.id,
      });
      return;
    }

    // ── Subcommand: list ──────────────────────────────────────
    const entries = getAfkEntriesForGuild(guild.id);
    if (entries.length === 0) {
      await respond.info('There are currently no members marked as AFK in this server.');
      return;
    }

    const lines = entries.map((e) => {
      const relTime = timestamp(e.startedAt, 'R');
      return `• ${mentionUser(e.userId, guild)} — **${e.reason}** (${relTime})`;
    });

    const payload = ui.standard({
      title: `Active AFK Members (${entries.length})`,
      text: lines.join('\n'),
    });

    await (channel as GuildTextBasedChannel).send(payload);
  },
});

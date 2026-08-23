import { PermissionsBitField, OverwriteType } from 'discord.js';
import type { GuildChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { mentionRole, mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';

export default defineCommand({
  name: 'lock',
  aliases: ['l', 'unlock'],
  module: 'moderation',
  description: 'Lock or unlock a channel by managing SendMessages permissions for @everyone, all roles, or a specific role.',
  usage: 'lock [@Role|all|off] | unlock [@Role|all]',
  examples: ['lock', 'unlock', 'lock @GameHost', 'unlock @GameHost', 'lock all', 'unlock all'],
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, respond, member } = ctx;

    const targetChannel = channel as GuildChannel;
    if (!('permissionOverwrites' in targetChannel)) {
      await respond.error('Lock/Unlock can only be executed in server channels.');
      return;
    }

    const aliasUsed = parsed.aliasUsed.toLowerCase();
    const isExplicitUnlock = ['unlock', 'ul', 'unlockchannel'].includes(aliasUsed) || parsed.args[0]?.toLowerCase() === 'off' || parsed.args[0]?.toLowerCase() === 'unlock';

    const cleanArgs = (parsed.args[0]?.toLowerCase() === 'off' || parsed.args[0]?.toLowerCase() === 'unlock' || parsed.args[0]?.toLowerCase() === 'on' || parsed.args[0]?.toLowerCase() === 'lock')
      ? parsed.args.slice(1)
      : parsed.args;

    if (cleanArgs.length > 1) {
      await respond.error(`Usage: \`${parsed.prefix}lock [@Role|all]\` or \`${parsed.prefix}unlock [@Role|all]\`.`);
      return;
    }

    const everyoneRole = guild.roles.everyone;
    let logTarget = 'everyone';

    if (!isExplicitUnlock) {
      // ── LOCK LOGIC ──
      const permToEdit = { SendMessages: false };

      if (cleanArgs.length === 0) {
        await (targetChannel as any).permissionOverwrites.edit(everyoneRole.id, permToEdit).catch(() => {});
        logTarget = mentionRole(everyoneRole, guild);
        await respond.transientSuccess(`Locked ${mentionChannel(targetChannel.id)} for ${logTarget}. *(Auto-deleting in 5s)*`, 5000);
      } else if (cleanArgs[0].toLowerCase() === 'all') {
        await (targetChannel as any).permissionOverwrites.edit(everyoneRole.id, permToEdit).catch(() => {});
        let count = 1;
        for (const [, overwrite] of (targetChannel as any).permissionOverwrites.cache) {
          if (overwrite.type === OverwriteType.Role && overwrite.id !== everyoneRole.id) {
            await (targetChannel as any).permissionOverwrites.edit(overwrite.id, permToEdit).catch(() => {});
            count++;
            await new Promise(r => setTimeout(r, 50));
          }
        }
        logTarget = `All roles (${count} overrides)`;
        await respond.transientSuccess(`Locked ${mentionChannel(targetChannel.id)} for all **${count}** role overrides. *(Auto-deleting in 5s)*`, 5000);
      } else {
        const roleRes = resolveRole(cleanArgs[0], guild);
        if (!roleRes.success) {
          await respond.error(`Invalid target argument. Expected a role or 'all'. Error: ${roleRes.error}`);
          return;
        }
        const targetRole = roleRes.value.role;
        await (targetChannel as any).permissionOverwrites.edit(targetRole.id, permToEdit);
        logTarget = mentionRole(targetRole, guild);
        await respond.transientSuccess(`Locked ${mentionChannel(targetChannel.id)} for ${logTarget}. *(Auto-deleting in 5s)*`, 5000);
      }

      logAuditAction({
        guild,
        action: 'Channel Locked',
        executor: member,
        channelName: targetChannel.name,
        details: `• **Scope:** ${logTarget}`,
      });

      logEvent('info', 'command_execution', `Channel lock by ${member.user.tag}`, {
        executor: member.user.tag,
        executorId: member.id,
        guild: guild.name,
        guildId: guild.id,
        targetChannel: targetChannel.name,
        args: parsed.rawArgs,
      });
    } else {
      // ── UNLOCK LOGIC ──
      const permInherit = { SendMessages: null };
      const permAllow = { SendMessages: true };

      if (cleanArgs.length === 0) {
        await (targetChannel as any).permissionOverwrites.edit(everyoneRole.id, permInherit).catch(() => {});
        logTarget = mentionRole(everyoneRole, guild);
        await respond.transientSuccess(`Unlocked ${mentionChannel(targetChannel.id)} for ${logTarget} (inherited). *(Auto-deleting in 5s)*`, 5000);
      } else if (cleanArgs[0].toLowerCase() === 'all') {
        await (targetChannel as any).permissionOverwrites.edit(everyoneRole.id, permInherit).catch(() => {});
        let count = 1;
        for (const [, overwrite] of (targetChannel as any).permissionOverwrites.cache) {
          if (overwrite.type === OverwriteType.Role && overwrite.id !== everyoneRole.id) {
            await (targetChannel as any).permissionOverwrites.edit(overwrite.id, permInherit).catch(() => {});
            count++;
            await new Promise(r => setTimeout(r, 50));
          }
        }
        logTarget = `All roles (${count} overrides)`;
        await respond.transientSuccess(`Unlocked ${mentionChannel(targetChannel.id)} for all **${count}** role overrides (inherited). *(Auto-deleting in 5s)*`, 5000);
      } else {
        const roleRes = resolveRole(cleanArgs[0], guild);
        if (!roleRes.success) {
          await respond.error(`Invalid target argument. Expected a role or 'all'. Error: ${roleRes.error}`);
          return;
        }
        const targetRole = roleRes.value.role;
        await (targetChannel as any).permissionOverwrites.edit(targetRole.id, permAllow);
        logTarget = mentionRole(targetRole, guild);
        await respond.transientSuccess(`Unlocked ${mentionChannel(targetChannel.id)} for ${logTarget} (explicitly allowed). *(Auto-deleting in 5s)*`, 5000);
      }

      logAuditAction({
        guild,
        action: 'Channel Unlocked',
        executor: member,
        channelName: targetChannel.name,
        details: `• **Scope:** ${logTarget}`,
      });

      logEvent('info', 'command_execution', `Channel unlock by ${member.user.tag}`, {
        executor: member.user.tag,
        executorId: member.id,
        guild: guild.name,
        guildId: guild.id,
        targetChannel: targetChannel.name,
        args: parsed.rawArgs,
      });
    }
  },
});

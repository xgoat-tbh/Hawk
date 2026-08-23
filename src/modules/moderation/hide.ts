import { PermissionsBitField, OverwriteType, TextChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { mentionRole, mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';

export default defineCommand({
  name: 'hide',
  aliases: ['h', 'unhide'],
  module: 'moderation',
  description: 'Hide or unhide a channel by managing ViewChannel permissions for @everyone, all roles, or a specific role.',
  usage: 'hide [@Role|all|off] | unhide [@Role|all]',
  examples: ['hide', 'unhide', 'hide @GameHost', 'unhide @GameHost', 'hide all', 'unhide all'],
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, respond, member } = ctx;

    const targetChannel = channel as TextChannel;
    if (!('permissionOverwrites' in targetChannel)) {
      await respond.error('Hide/Unhide can only be executed in text channels.');
      return;
    }

    const aliasUsed = parsed.aliasUsed.toLowerCase();
    const isExplicitUnhide = ['unhide', 'unh', 'unhidechannel'].includes(aliasUsed) || parsed.args[0]?.toLowerCase() === 'off' || parsed.args[0]?.toLowerCase() === 'unhide';

    const cleanArgs = (parsed.args[0]?.toLowerCase() === 'off' || parsed.args[0]?.toLowerCase() === 'unhide' || parsed.args[0]?.toLowerCase() === 'on' || parsed.args[0]?.toLowerCase() === 'hide')
      ? parsed.args.slice(1)
      : parsed.args;

    if (cleanArgs.length > 1) {
      await respond.error(`Usage: \`${parsed.prefix}hide [@Role|all]\` or \`${parsed.prefix}unhide [@Role|all]\`.`);
      return;
    }

    const everyoneRole = guild.roles.everyone;
    let logTarget = 'everyone';

    if (!isExplicitUnhide) {
      // ── HIDE LOGIC ──
      if (cleanArgs.length === 0) {
        await targetChannel.permissionOverwrites.edit(everyoneRole.id, { ViewChannel: false }).catch(() => {});
        logTarget = mentionRole(everyoneRole, guild);
        await respond.transientSuccess(`Hidden ${mentionChannel(targetChannel.id)} from ${logTarget}. *(Auto-deleting in 5s)*`, 5000);
      } else if (cleanArgs[0].toLowerCase() === 'all') {
        await targetChannel.permissionOverwrites.edit(everyoneRole.id, { ViewChannel: false }).catch(() => {});
        let count = 1;
        for (const [, overwrite] of targetChannel.permissionOverwrites.cache) {
          if (overwrite.type === OverwriteType.Role && overwrite.id !== everyoneRole.id) {
            await targetChannel.permissionOverwrites.edit(overwrite.id, { ViewChannel: false }).catch(() => {});
            count++;
            await new Promise(r => setTimeout(r, 50));
          }
        }
        logTarget = `All roles (${count} overrides)`;
        await respond.transientSuccess(`Hidden ${mentionChannel(targetChannel.id)} from all **${count}** role overrides. *(Auto-deleting in 5s)*`, 5000);
      } else {
        const roleRes = resolveRole(cleanArgs[0], guild);
        if (!roleRes.success) {
          await respond.error(`Invalid target argument. Expected a role or 'all'. Error: ${roleRes.error}`);
          return;
        }
        const targetRole = roleRes.value.role;
        await targetChannel.permissionOverwrites.edit(targetRole.id, { ViewChannel: false });
        logTarget = mentionRole(targetRole, guild);
        await respond.transientSuccess(`Hidden ${mentionChannel(targetChannel.id)} from ${logTarget}. *(Auto-deleting in 5s)*`, 5000);
      }

      logAuditAction({
        guild,
        action: 'Channel Hidden',
        executor: member,
        channelName: targetChannel.name,
        details: `• **Scope:** ${logTarget}`,
      });

      logEvent('info', 'command_execution', `Channel hide by ${member.user.tag}`, {
        executor: member.user.tag,
        executorId: member.id,
        guild: guild.name,
        guildId: guild.id,
        targetChannel: targetChannel.name,
        args: parsed.rawArgs,
      });
    } else {
      // ── UNHIDE LOGIC ──
      if (cleanArgs.length === 0) {
        await targetChannel.permissionOverwrites.edit(everyoneRole.id, { ViewChannel: null }).catch(() => {});
        logTarget = mentionRole(everyoneRole, guild);
        await respond.transientSuccess(`Unhidden ${mentionChannel(targetChannel.id)} for ${logTarget} (inherited). *(Auto-deleting in 5s)*`, 5000);
      } else if (cleanArgs[0].toLowerCase() === 'all') {
        await targetChannel.permissionOverwrites.edit(everyoneRole.id, { ViewChannel: null }).catch(() => {});
        let count = 1;
        for (const [, overwrite] of targetChannel.permissionOverwrites.cache) {
          if (overwrite.type === OverwriteType.Role && overwrite.id !== everyoneRole.id) {
            await targetChannel.permissionOverwrites.edit(overwrite.id, { ViewChannel: null }).catch(() => {});
            count++;
            await new Promise(r => setTimeout(r, 50));
          }
        }
        logTarget = `All roles (${count} overrides)`;
        await respond.transientSuccess(`Unhidden ${mentionChannel(targetChannel.id)} for all **${count}** role overrides (inherited). *(Auto-deleting in 5s)*`, 5000);
      } else {
        const roleRes = resolveRole(cleanArgs[0], guild);
        if (!roleRes.success) {
          await respond.error(`Invalid target argument. Expected a role or 'all'. Error: ${roleRes.error}`);
          return;
        }
        const targetRole = roleRes.value.role;
        await targetChannel.permissionOverwrites.edit(targetRole.id, { ViewChannel: true });
        logTarget = mentionRole(targetRole, guild);
        await respond.transientSuccess(`Unhidden ${mentionChannel(targetChannel.id)} for ${logTarget} (explicitly allowed). *(Auto-deleting in 5s)*`, 5000);
      }

      logAuditAction({
        guild,
        action: 'Channel Unhidden',
        executor: member,
        channelName: targetChannel.name,
        details: `• **Scope:** ${logTarget}`,
      });

      logEvent('info', 'command_execution', `Channel unhide by ${member.user.tag}`, {
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

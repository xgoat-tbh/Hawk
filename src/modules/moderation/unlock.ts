import { PermissionsBitField, OverwriteType } from 'discord.js';
import type { GuildChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { mentionRole, mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'unlock',
  aliases: ['ul', 'unlockchannel'],
  module: 'moderation',
  description: 'Unlock a channel by restoring SendMessages permission according to target mode.',
  usage: 'unlock [@Role|all]',
  examples: ['unlock', 'unlock @GameHost', 'unlock all'],
  permissions: [PermissionsBitField.Flags.ManageChannels],
  botPermissions: [PermissionsBitField.Flags.ManageChannels],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, channel, respond, member } = ctx;

    const targetChannel = channel as GuildChannel;
    if (!('permissionOverwrites' in targetChannel)) {
      await respond.error('Unlock can only be executed in server channels.');
      return;
    }

    if (parsed.args.length > 1) {
      await respond.error(`Usage: \`${parsed.prefix}unlock [@Role|all]\` (accepts at most one target argument).`);
      return;
    }

    const permInherit = { SendMessages: null };
    const permAllow = { SendMessages: true };

    // Mode 1: No argument -> @everyone: INHERIT (null)
    if (parsed.args.length === 0) {
      const everyoneRole = guild.roles.everyone;
      await (targetChannel as any).permissionOverwrites.edit(everyoneRole.id, permInherit).catch(() => {});
      await respond.success(`Unlocked ${mentionChannel(targetChannel.id)} for ${mentionRole(everyoneRole, guild)} (inherited).`);
    }
    // Mode 3: "all" argument -> @everyone: INHERIT (null) + every existing role override: INHERIT (null)
    else if (parsed.args[0].toLowerCase() === 'all') {
      const everyoneRole = guild.roles.everyone;
      await (targetChannel as any).permissionOverwrites.edit(everyoneRole.id, permInherit).catch(() => {});

      let count = 1;
      for (const [, overwrite] of (targetChannel as any).permissionOverwrites.cache) {
        if (overwrite.type === OverwriteType.Role && overwrite.id !== everyoneRole.id) {
          await (targetChannel as any).permissionOverwrites.edit(overwrite.id, permInherit).catch(() => {});
          count++;
          await new Promise(r => setTimeout(r, 50));
        }
      }
      await respond.success(`Unlocked ${mentionChannel(targetChannel.id)} for all **${count}** role overrides (inherited).`);
    }
    // Mode 2: Role argument -> ONLY specified role: ALLOW (true)
    else {
      const roleRes = resolveRole(parsed.args[0], guild);
      if (!roleRes.success) {
        await respond.error(`Invalid target argument. Expected a role or 'all'. Error: ${roleRes.error}`);
        return;
      }
      const targetRole = roleRes.value.role;
      await (targetChannel as any).permissionOverwrites.edit(targetRole.id, permAllow);
      await respond.success(`Unlocked ${mentionChannel(targetChannel.id)} for ${mentionRole(targetRole, guild)} (explicitly allowed).`);
    }

    logEvent('info', 'command_execution', `Channel unlock by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetChannel: targetChannel.name,
      args: parsed.rawArgs,
    });
  },
});

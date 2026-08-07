import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { toggleRoleForMember, extractForceMoveOption, executeForceMove } from './roleHelpers.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'role',
  aliases: ['r', 'addrole', 'giverole'],
  module: 'moderation',
  description: 'Toggle one or multiple roles for a target user, with optional force-move to a voice channel.',
  usage: 'role <user> <roles...> [fmv <#vc>]',
  examples: ['role @User @Role', 'role @User @Role1 @Role2', 'role @User @Role fmv #General'],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, respond, member } = ctx;

    const fmvResult = extractForceMoveOption(parsed.args, guild, member);
    if (fmvResult.error) {
      await respond.error(fmvResult.error);
      return;
    }

    const cleanArgs = fmvResult.cleanArgs;
    if (cleanArgs.length < 2) {
      await respond.error(`Usage: \`${parsed.prefix}role <user> <roles...> [fmv <#vc>]\``);
      return;
    }

    const userRes = await resolveUser(cleanArgs[0], guild);
    if (!userRes.success || !userRes.value.member) {
      const errMsg = !userRes.success ? userRes.error : 'Could not resolve member.';
      await respond.error(`User: ${errMsg}`);
      return;
    }

    const targetMember = userRes.value.member;
    const roleArgs = cleanArgs.slice(1);

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;

    for (const roleArg of roleArgs) {
      const roleRes = resolveRole(roleArg, guild);
      if (!roleRes.success) {
        skippedCount++;
        continue;
      }

      const res = await toggleRoleForMember(guild, targetMember, roleRes.value.role, member);
      if (res === 'added') addedCount++;
      else if (res === 'removed') removedCount++;
      else skippedCount++;
    }

    let moveInfo = '';
    if (fmvResult.hasFmv && fmvResult.destVc) {
      const moveRes = await executeForceMove([targetMember], fmvResult.destVc);
      if (moveRes.movedCount > 0) {
        moveInfo = `\n\n🔊 Moved ${mentionUser(targetMember.id)} to **${fmvResult.destVc.name}**.`;
      } else {
        moveInfo = `\n\n🔊 User is not in a voice channel to move.`;
      }
    }

    await respond.success(
      `Role update for ${mentionUser(targetMember.id)}:\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}${moveInfo}`,
    );

    logEvent('info', 'command_execution', `Role toggle by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetUser: targetMember.user.tag,
      addedCount,
      removedCount,
      skippedCount,
      hasFmv: fmvResult.hasFmv,
    });
  },
});

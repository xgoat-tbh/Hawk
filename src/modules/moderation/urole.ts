import { PermissionsBitField } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { toggleRoleForMember, extractForceMoveOption, executeForceMove } from './roleHelpers.js';
import { mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';

export default defineCommand({
  name: 'urole',
  aliases: ['ur', 'removerole', 'unrole', 'takerole'],
  module: 'moderation',
  description: 'Toggle ONE role across MULTIPLE users, with optional force-move to a voice channel.',
  usage: 'urole <role> <users...> [fmv <#vc>]',
  examples: ['urole @Role @User1 @User2 @User3', 'urole @Role @User1 @User2 fmv #General'],
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
      await respond.error('Usage: `?urole <role> <users...> [fmv <#vc>]`');
      return;
    }

    const roleRes = resolveRole(cleanArgs[0], guild);
    if (!roleRes.success) {
      await respond.error(`Role: ${roleRes.error}`);
      return;
    }

    const targetRole = roleRes.value.role;
    const userArgs = cleanArgs.slice(1);

    let addedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;
    const affectedMembersList: import('discord.js').GuildMember[] = [];

    for (const userArg of userArgs) {
      const userRes = await resolveUser(userArg, guild);
      if (!userRes.success || !userRes.value.member) {
        skippedCount++;
        continue;
      }

      const res = await toggleRoleForMember(guild, userRes.value.member, targetRole, member);
      if (res === 'added') {
        addedCount++;
        affectedMembersList.push(userRes.value.member);
      } else if (res === 'removed') {
        removedCount++;
        affectedMembersList.push(userRes.value.member);
      } else {
        skippedCount++;
      }
    }

    let moveInfo = '';
    if (fmvResult.hasFmv && fmvResult.destVc) {
      const moveRes = await executeForceMove(affectedMembersList, fmvResult.destVc);
      moveInfo = `\n\n🔊 Moved **${moveRes.movedCount}** member(s) to **${fmvResult.destVc.name}**.`;
    }

    await respond.success(
      `Role update for ${mentionRole(targetRole.id)}:\nAdded: **${addedCount}** | Removed: **${removedCount}**${skippedCount > 0 ? ` | Skipped: **${skippedCount}**` : ''}${moveInfo}`,
    );

    logEvent('info', 'command_execution', `URole toggle by ${member.user.tag}`, {
      executor: member.user.tag,
      executorId: member.id,
      guild: guild.name,
      guildId: guild.id,
      targetRole: targetRole.name,
      addedCount,
      removedCount,
      skippedCount,
      hasFmv: fmvResult.hasFmv,
    });
  },
});

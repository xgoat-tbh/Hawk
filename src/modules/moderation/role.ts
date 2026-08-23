import { PermissionsBitField } from 'discord.js';
import type { GuildMember, Role, GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveRole } from '../../core/resolver/RoleResolver.js';
import { toggleRoleForMember, isRoleManageable } from './roleHelpers.js';
import { formatUser, mentionRole } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
import { ui } from '../../core/ui/index.js';
import { LiveProgressTracker, renderProgressBar } from '../../core/utils/ProgressBar.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

export default defineCommand({
  name: 'role',
  aliases: [
    'r',
    'addrole',
    'giverole',
    'urole',
    'ur',
    'unrole',
    'removerole',
    'takerole',
    'roleicon',
    'ricon',
    'setroleicon',
    'removeroleicon',
  ],
  module: 'moderation',
  description: 'Manage roles: toggle roles for a user, batch-toggle a role across multiple users, or set role icons.',
  usage: 'role [user] <roles...> | role <role> <users...> | role icon <role> [emoji|url|none]',
  examples: [
    'role @Role',
    'role @User @Role',
    'role @User @Role1 @Role2',
    'role @Role @User1 @User2 @User3',
    'role icon @VIP 👑',
    'role icon @VIP none',
    'urole @Role @User1 @User2',
    'roleicon @VIP 🔥',
  ],
  permissions: [PermissionsBitField.Flags.ManageRoles],
  botPermissions: [PermissionsBitField.Flags.ManageRoles],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, respond } = ctx;
    const aliasUsed = parsed.aliasUsed.toLowerCase();

    // ── Direct Role Icon Aliases ──
    if (['roleicon', 'ricon', 'setroleicon', 'removeroleicon'].includes(aliasUsed)) {
      await handleRoleIcon(ctx, parsed.args);
      return;
    }

    // ── Direct URole Aliases ──
    if (['urole', 'ur', 'unrole', 'removerole', 'takerole'].includes(aliasUsed)) {
      await handleURole(ctx, parsed.args);
      return;
    }

    if (parsed.args.length === 0) {
      await respond.error(
        `Usage: \`${parsed.prefix}role [user] <roles...>\` or \`${parsed.prefix}role <role> <users...>\` or \`${parsed.prefix}role icon <role> [emoji|url|none]\``,
      );
      return;
    }

    // ── Subcommand: icon ──
    if (parsed.args[0].toLowerCase() === 'icon') {
      await handleRoleIcon(ctx, parsed.args.slice(1));
      return;
    }

    // ── Check if first arg is a Role (URole syntax: role <role> <users...>) ──
    const firstRoleRes = resolveRole(parsed.args[0], ctx.guild);
    if (firstRoleRes.success && parsed.args.length >= 2) {
      const secondUserRes = await resolveUser(parsed.args[1], ctx.guild);
      if (secondUserRes.success) {
        await handleURole(ctx, parsed.args);
        return;
      }
    }

    // ── Standard User Role Toggle: role [user] <roles...> ──
    await handleStandardRole(ctx);
  },
});

async function handleStandardRole(ctx: CommandContext): Promise<void> {
  const { parsed, guild, respond, member, replyTarget } = ctx;

  let targetMember: GuildMember | null = null;
  let roleArgs: string[] = [];

  const userRes = await resolveUser(parsed.args[0], guild);
  if (userRes.success && userRes.value.member) {
    targetMember = userRes.value.member;
    roleArgs = parsed.args.slice(1);
  } else {
    targetMember = replyTarget ?? member;
    roleArgs = parsed.args;
  }

  if (!targetMember) {
    await respond.error('Could not resolve target member.');
    return;
  }

  if (roleArgs.length === 0) {
    await respond.error(`Specify at least one role to toggle. Usage: \`${parsed.prefix}role [user] <roles...>\`.`);
    return;
  }

  const addedRoles: Role[] = [];
  const removedRoles: Role[] = [];
  let skippedCount = 0;

  for (const roleArg of roleArgs) {
    const roleRes = resolveRole(roleArg, guild);
    if (!roleRes.success) {
      skippedCount++;
      continue;
    }

    const role = roleRes.value.role;
    const res = await toggleRoleForMember(guild, targetMember, role, member);
    if (res === 'added') addedRoles.push(role);
    else if (res === 'removed') removedRoles.push(role);
    else skippedCount++;
  }

  const diffLines: string[] = [];
  if (addedRoles.length > 0) diffLines.push(`[+] Added: ${addedRoles.map(r => mentionRole(r, guild)).join(', ')}`);
  if (removedRoles.length > 0) diffLines.push(`[-] Removed: ${removedRoles.map(r => mentionRole(r, guild)).join(', ')}`);
  if (skippedCount > 0) diffLines.push(`[!] Skipped: **${skippedCount}** role(s) (hierarchy/permissions)`);
  if (diffLines.length === 0) diffLines.push('No role changes applied.');

  const diffText = `Role update for ${formatUser(targetMember, guild)}:\n${diffLines.join('\n')}`;
  await respond.transientSuccess(diffText, 5000);

  logAuditAction({
    guild,
    action: 'Member Role Updated',
    executor: member,
    target: formatUser(targetMember, guild),
    details: [
      `• **Target:** ${targetMember.user.tag} (${targetMember.id})`,
      ...diffLines.map(line => `• ${line}`),
    ],
  });

  logEvent('info', 'command_execution', `Role toggle by ${member.user.tag}`, {
    executor: member.user.tag,
    executorId: member.id,
    guild: guild.name,
    guildId: guild.id,
    targetUser: targetMember.user.tag,
    addedCount: addedRoles.length,
    removedCount: removedRoles.length,
    skippedCount,
  });
}

async function handleURole(ctx: CommandContext, args: string[]): Promise<void> {
  const { guild, respond, member, channel } = ctx;

  if (args.length < 2) {
    await respond.error(`Usage: \`${ctx.parsed.prefix}role <role> <users...>\``);
    return;
  }

  const roleRes = resolveRole(args[0], guild);
  if (!roleRes.success) {
    await respond.error(`Role: ${roleRes.error}`);
    return;
  }

  const targetRole = roleRes.value.role;
  const userArgs = args.slice(1);
  const totalUsers = userArgs.length;

  let statusMsg = null;
  let tracker: LiveProgressTracker | null = null;
  if (totalUsers > 3) {
    const initialPayload = ui.standard({
      title: `URole: ${targetRole.name}`,
      text: `Target: ${mentionRole(targetRole, guild)} (${totalUsers} users)\n**Progress:** ${renderProgressBar(0, totalUsers)} (0/${totalUsers})\nAdded: **0** | Removed: **0** | Skipped: **0**`,
    });
    statusMsg = await (channel as GuildTextBasedChannel).send({
      components: initialPayload.components,
      flags: initialPayload.flags as any,
    }).catch(() => null);
    if (statusMsg) {
      tracker = new LiveProgressTracker(statusMsg, `URole (${targetRole.name})`, totalUsers);
    }
  }

  let addedCount = 0;
  let removedCount = 0;
  let skippedCount = 0;

  let processed = 0;
  const CHUNK_SIZE = 5;
  for (let i = 0; i < userArgs.length; i += CHUNK_SIZE) {
    const chunk = userArgs.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(async (userArg) => {
        const userRes = await resolveUser(userArg, guild);
        if (!userRes.success || !userRes.value.member) {
          return { member: null, res: 'skipped' as const };
        }
        const targetMem = userRes.value.member;
        const res = await toggleRoleForMember(guild, targetMem, targetRole, member);
        return { member: targetMem, res };
      })
    );

    for (const { res } of results) {
      if (res === 'added') addedCount++;
      else if (res === 'removed') removedCount++;
      else skippedCount++;
    }
    processed += chunk.length;
    if (tracker) {
      await tracker.update(processed, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`);
    }
    if (i + CHUNK_SIZE < userArgs.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  if (tracker) {
    await tracker.update(totalUsers, `Added: **${addedCount}** | Removed: **${removedCount}** | Skipped: **${skippedCount}**`, true);
  }

  const diffLines: string[] = [];
  if (addedCount > 0) diffLines.push(`[+] Added to **${addedCount}** member(s)`);
  if (removedCount > 0) diffLines.push(`[-] Removed from **${removedCount}** member(s)`);
  if (skippedCount > 0) diffLines.push(`[!] Skipped **${skippedCount}** member(s)`);
  if (diffLines.length === 0) diffLines.push('No changes applied.');

  const summaryText = `Role update for ${mentionRole(targetRole, guild)}:\n${diffLines.join('\n')}\n• *(Auto-deleting in 5s)*`;

  if (statusMsg) {
    const finalPayload = ui.standard({
      title: 'URole Completed',
      text: summaryText,
    });
    await statusMsg.edit({ components: finalPayload.components, flags: finalPayload.flags as any }).catch(() => {});
    setTimeout(() => statusMsg?.delete().catch(() => {}), 5000);
  } else {
    const replyMsg = await respond.success(summaryText);
    setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
  }

  logAuditAction({
    guild,
    action: 'Batch Role Update (URole)',
    executor: member,
    target: mentionRole(targetRole, guild),
    details: [
      `• **Role:** \`${targetRole.name}\` (${targetRole.id})`,
      ...diffLines.map(line => `• ${line}`),
    ],
  });

  logEvent('info', 'command_execution', `URole toggle by ${member.user.tag}`, {
    executor: member.user.tag,
    executorId: member.id,
    guild: guild.name,
    guildId: guild.id,
    targetRole: targetRole.name,
    addedCount,
    removedCount,
    skippedCount,
  });
}

async function handleRoleIcon(ctx: CommandContext, args: string[]): Promise<void> {
  const { guild, member, respond } = ctx;

  if (args.length === 0) {
    await respond.error(`Usage: \`${ctx.parsed.prefix}role icon <role> [emoji|url|none]\``);
    return;
  }

  const roleRes = resolveRole(args[0], guild);
  if (!roleRes.success) {
    await respond.error(`Role: ${roleRes.error}`);
    return;
  }

  const targetRole = roleRes.value.role;
  if (!isRoleManageable(guild, targetRole, member)) {
    await respond.error(`Cannot modify ${mentionRole(targetRole, guild)} due to role hierarchy or permissions.`);
    return;
  }

  if (args.length < 2 || ['none', 'clear', 'remove', 'delete', 'off'].includes(args[1].toLowerCase())) {
    try {
      await targetRole.setIcon(null, `Role icon removed by ${member.user.tag}`);
      await respond.success(`Removed role icon from ${mentionRole(targetRole, guild)}.`);
      logEvent('info', 'command_execution', `Role icon removed by ${member.user.tag}`, {
        executor: member.user.tag,
        role: targetRole.name,
        guild: guild.name,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await respond.error(`Failed to remove role icon: ${msg}`);
    }
    return;
  }

  const iconInput = args.slice(1).join(' ').trim();
  let targetIcon: string | null = null;
  let iconType = 'url';

  const customEmojiRegex = /<(a)?:([a-zA-Z0-9_]+):(\d{17,20})>/;
  const customMatch = customEmojiRegex.exec(iconInput);
  if (customMatch) {
    const emojiId = customMatch[3];
    targetIcon = `https://cdn.discordapp.com/emojis/${emojiId}.png?size=96&quality=lossless`;
    iconType = 'custom_emoji';
  }

  if (!targetIcon) {
    const maskedLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
    const maskedMatch = maskedLinkRegex.exec(iconInput);
    if (maskedMatch) {
      targetIcon = maskedMatch[2];
      iconType = 'masked_link';
    }
  }

  if (!targetIcon) {
    const rawUrlRegex = /https?:\/\/[^\s]+/;
    const urlMatch = rawUrlRegex.exec(iconInput);
    if (urlMatch) {
      targetIcon = urlMatch[0];
      iconType = 'url';
    }
  }

  if (!targetIcon) {
    const unicodeEmojiRegex = /\p{Extended_Pictographic}/u;
    if (unicodeEmojiRegex.test(iconInput)) {
      targetIcon = iconInput.trim();
      iconType = 'unicode_emoji';
    }
  }

  if (!targetIcon) {
    await respond.error('Please provide a valid emoji, image URL, or masked link for the role icon.');
    return;
  }

  try {
    await targetRole.setIcon(targetIcon, `Role icon updated by ${member.user.tag}`);
    await respond.success(`Successfully set role icon for ${mentionRole(targetRole, guild)}!`);

    logEvent('info', 'command_execution', `Role icon updated by ${member.user.tag}`, {
      executor: member.user.tag,
      role: targetRole.name,
      iconType,
      targetIcon,
      guild: guild.name,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    consoleLog('error', 'command_failure', `role icon: failed to set icon for ${targetRole.id}`, { error: msg });
    await respond.error(`Failed to set role icon: ${msg}\n*(Note: Server role icons require Server Boost Level 2).*`);
  }
}

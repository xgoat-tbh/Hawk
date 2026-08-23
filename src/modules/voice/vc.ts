import { PermissionsBitField } from 'discord.js';
import type { GuildMember, VoiceBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';
import { checkVoiceAccess } from './vconfigEvaluator.js';
import { isMemberManageable } from '../moderation/roleHelpers.js';
import { formatUser, mentionChannel } from '../../core/utils/formatters.js';
import { logEvent } from '../../core/logging/WebhookLogger.js';
import { logAuditAction } from '../../core/logging/AuditLogger.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

export default defineCommand({
  name: 'vc',
  aliases: [
    'vcmute',
    'vmute',
    'vm',
    'vcunmute',
    'vunmute',
    'vum',
    'vcmuteall',
    'muteall',
    'muteallvc',
    'vcunmuteall',
    'unmuteall',
    'unmuteallvc',
    'vcdeafen',
    'vdeaf',
    'vd',
    'vcundeafen',
    'vundeafen',
    'vud',
    'vcdeafenall',
    'deafenall',
    'deafenallvc',
    'vcundeafenall',
    'undeafenall',
    'undeafenallvc',
    'vckick',
    'vck',
    'vcdc',
    'dckick',
    'disconnect',
    'vcslam',
    'slam',
    'vcunslam',
    'unslam',
  ],
  module: 'voice',
  description: 'Complete voice channel management: mute, unmute, deafen, undeafen, kick, or slam VC members.',
  usage: 'vc <mute|unmute|muteall|unmuteall|deafen|undeafen|deafenall|undeafenall|kick|slam|unslam> [args...]',
  examples: [
    'vc mute @User',
    'vc unmute @User',
    'vc muteall',
    'vc unmuteall',
    'vc deafen @User',
    'vc undeafen @User',
    'vc deafenall',
    'vc undeafenall',
    'vc kick @User',
    'vc slam',
    'vc unslam',
    'vcmute @User',
    'vckick @User',
    'slam',
  ],
  permissions: [],
  botPermissions: [
    PermissionsBitField.Flags.MuteMembers,
    PermissionsBitField.Flags.DeafenMembers,
    PermissionsBitField.Flags.MoveMembers,
  ],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, respond } = ctx;
    const aliasUsed = parsed.aliasUsed.toLowerCase();

    // ── Direct Shortcut Aliases ──
    if (['vcmute', 'vmute', 'vm'].includes(aliasUsed)) {
      await handleMute(ctx, parsed.args, true);
      return;
    }
    if (['vcunmute', 'vunmute', 'vum'].includes(aliasUsed)) {
      await handleMute(ctx, parsed.args, false);
      return;
    }
    if (['vcmuteall', 'muteall', 'muteallvc'].includes(aliasUsed)) {
      await handleMuteAll(ctx, parsed.args, true);
      return;
    }
    if (['vcunmuteall', 'unmuteall', 'unmuteallvc'].includes(aliasUsed)) {
      await handleMuteAll(ctx, parsed.args, false);
      return;
    }
    if (['vcdeafen', 'vdeaf', 'vd'].includes(aliasUsed)) {
      await handleDeafen(ctx, parsed.args, true);
      return;
    }
    if (['vcundeafen', 'vundeafen', 'vud'].includes(aliasUsed)) {
      await handleDeafen(ctx, parsed.args, false);
      return;
    }
    if (['vcdeafenall', 'deafenall', 'deafenallvc'].includes(aliasUsed)) {
      await handleDeafenAll(ctx, parsed.args, true);
      return;
    }
    if (['vcundeafenall', 'undeafenall', 'undeafenallvc'].includes(aliasUsed)) {
      await handleDeafenAll(ctx, parsed.args, false);
      return;
    }
    if (['vckick', 'vck', 'vcdc', 'dckick', 'disconnect'].includes(aliasUsed)) {
      await handleKick(ctx, parsed.args);
      return;
    }
    if (['vcslam', 'slam'].includes(aliasUsed)) {
      await handleSlam(ctx, parsed.args, true);
      return;
    }
    if (['vcunslam', 'unslam'].includes(aliasUsed)) {
      await handleSlam(ctx, parsed.args, false);
      return;
    }

    if (parsed.args.length === 0) {
      await respond.error(
        `**Voice Moderation Commands (\`vc\`):**\n` +
        `• \`${parsed.prefix}vc mute <targets...> [on|off]\`\n` +
        `• \`${parsed.prefix}vc unmute <targets...>\`\n` +
        `• \`${parsed.prefix}vc muteall [channel] [on|off]\`\n` +
        `• \`${parsed.prefix}vc unmuteall [channel]\`\n` +
        `• \`${parsed.prefix}vc deafen <targets...> [on|off]\`\n` +
        `• \`${parsed.prefix}vc undeafen <targets...>\`\n` +
        `• \`${parsed.prefix}vc deafenall [channel] [on|off]\`\n` +
        `• \`${parsed.prefix}vc undeafenall [channel]\`\n` +
        `• \`${parsed.prefix}vc kick <targets...>\`\n` +
        `• \`${parsed.prefix}vc slam [channel]\`\n` +
        `• \`${parsed.prefix}vc unslam [channel]\``,
      );
      return;
    }

    const sub = parsed.args[0].toLowerCase();
    const subArgs = parsed.args.slice(1);

    switch (sub) {
      case 'mute':
        await handleMute(ctx, subArgs, true);
        break;
      case 'unmute':
        await handleMute(ctx, subArgs, false);
        break;
      case 'muteall':
        await handleMuteAll(ctx, subArgs, true);
        break;
      case 'unmuteall':
        await handleMuteAll(ctx, subArgs, false);
        break;
      case 'deafen':
        await handleDeafen(ctx, subArgs, true);
        break;
      case 'undeafen':
        await handleDeafen(ctx, subArgs, false);
        break;
      case 'deafenall':
        await handleDeafenAll(ctx, subArgs, true);
        break;
      case 'undeafenall':
        await handleDeafenAll(ctx, subArgs, false);
        break;
      case 'kick':
      case 'disconnect':
      case 'dc':
        await handleKick(ctx, subArgs);
        break;
      case 'slam':
        await handleSlam(ctx, subArgs, true);
        break;
      case 'unslam':
        await handleSlam(ctx, subArgs, false);
        break;
      default:
        await respond.error(
          `Unknown subcommand \`${sub}\`. Valid options: \`mute\`, \`unmute\`, \`muteall\`, \`unmuteall\`, \`deafen\`, \`undeafen\`, \`deafenall\`, \`undeafenall\`, \`kick\`, \`slam\`, \`unslam\`.`,
        );
        break;
    }
  },
});

// ── Handlers ──────────────────────────────────────────────────

async function handleMute(ctx: CommandContext, rawArgs: string[], defaultState: boolean): Promise<void> {
  const { guild, member, respond } = ctx;
  if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
    await respond.denied('You require the **Mute Members** permission to use this command.');
    return;
  }

  let args = [...rawArgs];
  let targetState = defaultState;

  if (args.length > 0) {
    const last = args[args.length - 1].toLowerCase();
    if (['off', 'unmute', 'false'].includes(last)) {
      targetState = false;
      args.pop();
    } else if (['on', 'mute', 'true'].includes(last)) {
      targetState = true;
      args.pop();
    }
  }

  if (args.length === 0 && !ctx.replyTarget) {
    await respond.error(`Usage: \`${ctx.parsed.prefix}vc mute <targets...> [on|off]\` or \`${ctx.parsed.prefix}vc unmute <targets...>\``);
    return;
  }

  if (args.some((a) => ['all', '?all', '*'].includes(a.toLowerCase()))) {
    const channelArgs = args.filter((a) => !['all', '?all', '*'].includes(a.toLowerCase()));
    await handleMuteAll(ctx, channelArgs, targetState);
    return;
  }

  let targetMembers: GuildMember[] = [];
  if (ctx.replyTarget) targetMembers.push(ctx.replyTarget);

  for (const arg of args) {
    const res = await resolveUser(arg, guild);
    if (res.success && res.value.member) {
      targetMembers.push(res.value.member);
    }
  }

  // Deduplicate
  targetMembers = Array.from(new Set(targetMembers));

  if (targetMembers.length === 0) {
    await respond.error('No valid target members resolved.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const target of targetMembers) {
    if (!isMemberManageable(guild, target, member)) {
      failCount++;
      continue;
    }
    if (target.voice.channel) {
      try {
        await target.voice.setMute(targetState, `VC Mute requested by ${member.user.tag}`);
        successCount++;
      } catch {
        failCount++;
      }
    } else {
      failCount++;
    }
  }

  const actionText = targetState ? 'Muted' : 'Unmuted';
  await respond.transientSuccess(`${actionText} **${successCount}** user(s) in voice.${failCount > 0 ? ` Failed/Not in VC: ${failCount}` : ''} *(Auto-deleting in 5s)*`, 5000);

  logEvent('info', 'command_execution', `${targetState ? 'VCMute' : 'VCUnmute'} by ${member.user.tag}`, {
    executor: member.user.tag,
    executorId: member.id,
    guild: guild.name,
    guildId: guild.id,
    targetState,
    successCount,
    failCount,
  });
}

async function handleMuteAll(ctx: CommandContext, args: string[], defaultState: boolean): Promise<void> {
  const { guild, member, respond } = ctx;
  if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
    await respond.denied('You require the **Mute Members** permission to use this command.');
    return;
  }

  let channelArgs = [...args];
  let targetState = defaultState;

  if (channelArgs.length > 0) {
    const last = channelArgs[channelArgs.length - 1].toLowerCase();
    if (['off', 'unmute', 'false'].includes(last)) {
      targetState = false;
      channelArgs.pop();
    } else if (['on', 'mute', 'true'].includes(last)) {
      targetState = true;
      channelArgs.pop();
    }
  }

  let targetVc: VoiceBasedChannel | null = null;
  if (channelArgs.length === 0) {
    targetVc = member.voice.channel;
  } else {
    const res = resolveVoiceChannel(channelArgs.join(' '), guild);
    if (!res.success) {
      await respond.error(res.error);
      return;
    }
    targetVc = res.value.channel;
  }

  if (!targetVc) {
    await respond.error(`You must be connected to a voice channel or specify a channel to ${targetState ? 'mute' : 'unmute'} all.`);
    return;
  }

  const cmdName = targetState ? 'vcmuteall' : 'vcunmuteall';
  const access = await checkVoiceAccess(guild.id, member, cmdName, targetVc.id);
  if (!access.allowed) {
    await respond.denied(access.reason || 'Voice command access denied.');
    return;
  }

  const eligible = targetVc.members.filter((m) => {
    if (m.user.bot) return false;
    if (targetState && m.id === member.id) return false;
    if (!isMemberManageable(guild, m, member)) return false;
    if (targetState && m.voice.serverMute) return false;
    if (!targetState && !m.voice.serverMute) return false;
    return true;
  });

  if (eligible.size === 0) {
    await respond.info(`No manageable members to ${targetState ? 'mute' : 'unmute'} found in ${mentionChannel(targetVc.id)}.`);
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const reason = `${targetState ? 'VCMuteAll' : 'VCUnmuteAll'} by ${member.user.tag}`;

  for (const target of eligible.values()) {
    try {
      await target.voice.setMute(targetState, reason);
      successCount++;
    } catch {
      failCount++;
    }
  }

  const actionText = targetState ? 'Server-muted' : 'Server-unmuted';
  await respond.transientSuccess(
    `${actionText} **${successCount}** user(s) in ${mentionChannel(targetVc.id)}.${failCount > 0 ? ` (Failed: ${failCount})` : ''} *(Auto-deleting in 5s)*`,
    5000,
  );

  logEvent('info', 'command_execution', `${targetState ? 'VCMute' : 'VCUnmute'} All by ${member.user.tag}`, {
    executor: member.user.tag,
    executorId: member.id,
    guild: guild.name,
    guildId: guild.id,
    channel: targetVc.name,
    targetState,
    successCount,
    failCount,
  });
}

async function handleDeafen(ctx: CommandContext, rawArgs: string[], defaultState: boolean): Promise<void> {
  const { guild, member, respond } = ctx;
  if (!member.permissions.has(PermissionsBitField.Flags.DeafenMembers)) {
    await respond.denied('You require the **Deafen Members** permission to use this command.');
    return;
  }

  let args = [...rawArgs];
  let targetState = defaultState;

  if (args.length > 0) {
    const last = args[args.length - 1].toLowerCase();
    if (['off', 'undeafen', 'false'].includes(last)) {
      targetState = false;
      args.pop();
    } else if (['on', 'deafen', 'true'].includes(last)) {
      targetState = true;
      args.pop();
    }
  }

  if (args.length === 0 && !ctx.replyTarget) {
    await respond.error(`Usage: \`${ctx.parsed.prefix}vc deafen <targets...> [on|off]\` or \`${ctx.parsed.prefix}vc undeafen <targets...>\``);
    return;
  }

  if (args.some((a) => ['all', '?all', '*'].includes(a.toLowerCase()))) {
    const channelArgs = args.filter((a) => !['all', '?all', '*'].includes(a.toLowerCase()));
    await handleDeafenAll(ctx, channelArgs, targetState);
    return;
  }

  let targetMembers: GuildMember[] = [];
  if (ctx.replyTarget) targetMembers.push(ctx.replyTarget);

  for (const arg of args) {
    const res = await resolveUser(arg, guild);
    if (res.success && res.value.member) {
      targetMembers.push(res.value.member);
    }
  }

  targetMembers = Array.from(new Set(targetMembers));

  if (targetMembers.length === 0) {
    await respond.error('No valid target members resolved.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const target of targetMembers) {
    if (!isMemberManageable(guild, target, member)) {
      failCount++;
      continue;
    }
    if (target.voice.channel) {
      try {
        await target.voice.setDeaf(targetState, `VC Deafen requested by ${member.user.tag}`);
        successCount++;
      } catch {
        failCount++;
      }
    } else {
      failCount++;
    }
  }

  const actionText = targetState ? 'Deafened' : 'Undeafened';
  await respond.transientSuccess(`${actionText} **${successCount}** user(s) in voice.${failCount > 0 ? ` Failed/Not in VC: ${failCount}` : ''} *(Auto-deleting in 5s)*`, 5000);

  logEvent('info', 'command_execution', `${targetState ? 'VCDeafen' : 'VCUndeafen'} by ${member.user.tag}`, {
    executor: member.user.tag,
    executorId: member.id,
    guild: guild.name,
    guildId: guild.id,
    targetState,
    successCount,
    failCount,
  });
}

async function handleDeafenAll(ctx: CommandContext, args: string[], defaultState: boolean): Promise<void> {
  const { guild, member, respond } = ctx;
  if (!member.permissions.has(PermissionsBitField.Flags.DeafenMembers)) {
    await respond.denied('You require the **Deafen Members** permission to use this command.');
    return;
  }

  let channelArgs = [...args];
  let targetState = defaultState;

  if (channelArgs.length > 0) {
    const last = channelArgs[channelArgs.length - 1].toLowerCase();
    if (['off', 'undeafen', 'false'].includes(last)) {
      targetState = false;
      channelArgs.pop();
    } else if (['on', 'deafen', 'true'].includes(last)) {
      targetState = true;
      channelArgs.pop();
    }
  }

  let targetVc: VoiceBasedChannel | null = null;
  if (channelArgs.length === 0) {
    targetVc = member.voice.channel;
  } else {
    const res = resolveVoiceChannel(channelArgs.join(' '), guild);
    if (!res.success) {
      await respond.error(res.error);
      return;
    }
    targetVc = res.value.channel;
  }

  if (!targetVc) {
    await respond.error(`You must be connected to a voice channel or specify a channel to ${targetState ? 'deafen' : 'undeafen'} all.`);
    return;
  }

  const cmdName = targetState ? 'vcdeafenall' : 'vcundeafenall';
  const access = await checkVoiceAccess(guild.id, member, cmdName, targetVc.id);
  if (!access.allowed) {
    await respond.denied(access.reason || 'Voice command access denied.');
    return;
  }

  const eligible = targetVc.members.filter((m) => {
    if (m.user.bot) return false;
    if (targetState && m.id === member.id) return false;
    if (!isMemberManageable(guild, m, member)) return false;
    if (targetState && m.voice.serverDeaf) return false;
    if (!targetState && !m.voice.serverDeaf) return false;
    return true;
  });

  if (eligible.size === 0) {
    await respond.info(`No manageable members to ${targetState ? 'deafen' : 'undeafen'} found in ${mentionChannel(targetVc.id)}.`);
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const reason = `${targetState ? 'VCDeafenAll' : 'VCUndeafenAll'} by ${member.user.tag}`;

  for (const target of eligible.values()) {
    try {
      await target.voice.setDeaf(targetState, reason);
      successCount++;
    } catch {
      failCount++;
    }
  }

  const actionText = targetState ? 'Server-deafened' : 'Server-undeafened';
  await respond.transientSuccess(
    `${actionText} **${successCount}** user(s) in ${mentionChannel(targetVc.id)}.${failCount > 0 ? ` (Failed: ${failCount})` : ''} *(Auto-deleting in 5s)*`,
    5000,
  );

  logEvent('info', 'command_execution', `${targetState ? 'VCDeafen' : 'VCUndeafen'} All by ${member.user.tag}`, {
    executor: member.user.tag,
    executorId: member.id,
    guild: guild.name,
    guildId: guild.id,
    channel: targetVc.name,
    targetState,
    successCount,
    failCount,
  });
}

async function handleKick(ctx: CommandContext, rawArgs: string[]): Promise<void> {
  const { guild, member, respond, replyTarget } = ctx;
  if (!member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
    await respond.denied('You require the **Move Members** permission to disconnect members from voice.');
    return;
  }

  let targetMembers: GuildMember[] = [];
  if (replyTarget) targetMembers.push(replyTarget);

  for (const arg of rawArgs) {
    const res = await resolveUser(arg, guild);
    if (res.success && res.value.member) {
      targetMembers.push(res.value.member);
    }
  }

  targetMembers = Array.from(new Set(targetMembers));

  if (targetMembers.length === 0) {
    await respond.error(`Usage: \`${ctx.parsed.prefix}vc kick <targets...>\` or reply to a member.`);
    return;
  }

  const successes: string[] = [];
  const failures: string[] = [];

  for (const target of targetMembers) {
    const targetVc = target.voice.channel;
    if (!targetVc) {
      failures.push(`${formatUser(target, guild)} (not in VC)`);
      continue;
    }

    const access = await checkVoiceAccess(guild.id, member, 'vckick', targetVc.id);
    if (!access.allowed) {
      failures.push(`${formatUser(target, guild)} (restricted)`);
      continue;
    }

    try {
      await target.voice.disconnect(`Voice kick requested by ${member.user.tag}`);
      successes.push(formatUser(target, guild));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      consoleLog('error', 'command_failure', `vc kick: failed to disconnect ${target.id}`, { error: msg });
      failures.push(`${formatUser(target, guild)} (failed)`);
    }
  }

  if (successes.length > 0 && failures.length === 0) {
    await respond.transientSuccess(`Disconnected ${successes.join(', ')} from voice. *(Auto-deleting in 5s)*`, 5000);
  } else if (successes.length > 0 && failures.length > 0) {
    await respond.send(`> Disconnected ${successes.join(', ')} from voice.\n> **Notice:** Could not disconnect: ${failures.join(', ')}`);
  } else {
    await respond.error(`Could not disconnect: ${failures.join(', ')}`);
  }

  if (successes.length > 0) {
    logAuditAction({
      guild,
      action: 'Member Voice Kicked',
      executor: member,
      details: [`• **Disconnected:** ${successes.join(', ')}`],
    });
  }
}

async function handleSlam(ctx: CommandContext, rawArgs: string[], isSlam: boolean): Promise<void> {
  const { guild, member, respond } = ctx;
  if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers) || !member.permissions.has(PermissionsBitField.Flags.DeafenMembers)) {
    await respond.denied('You require both **Mute Members** and **Deafen Members** permissions to use VC Slam.');
    return;
  }

  let targetVc: VoiceBasedChannel | null = member.voice.channel;
  if (rawArgs.length > 0) {
    const res = resolveVoiceChannel(rawArgs.join(' '), guild);
    if (!res.success) {
      await respond.error(`Voice Channel: ${res.error}`);
      return;
    }
    targetVc = res.value.channel;
  }

  if (!targetVc) {
    await respond.error('You must be in a voice channel or specify a target voice channel.');
    return;
  }

  const membersInVc = Array.from(targetVc.members.values());
  if (membersInVc.length === 0) {
    await respond.info(`No members are currently connected to ${mentionChannel(targetVc.id)}.`);
    return;
  }

  const targets = membersInVc.filter((m) => {
    if (m.id === member.id) return false;
    const isStaff =
      m.permissions.has(PermissionsBitField.Flags.MuteMembers) ||
      m.permissions.has(PermissionsBitField.Flags.DeafenMembers) ||
      m.permissions.has(PermissionsBitField.Flags.Administrator) ||
      m.permissions.has(PermissionsBitField.Flags.ManageGuild);
    return !isStaff;
  });

  if (targets.length === 0) {
    await respond.info(`No non-staff members found in ${mentionChannel(targetVc.id)}.`);
    return;
  }

  let affectedCount = 0;
  const CHUNK_SIZE = 5;
  for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
    const chunk = targets.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(async (target) => {
        try {
          await target.voice.setMute(isSlam, `VC Slam by ${member.user.tag}`);
          await target.voice.setDeaf(isSlam, `VC Slam by ${member.user.tag}`);
          return true;
        } catch {
          return false;
        }
      })
    );
    affectedCount += results.filter(Boolean).length;
  }

  const actionText = isSlam ? 'Muted & Deafened' : 'Unmuted & Undeafened';
  await respond.transientSuccess(
    `Successfully **${actionText} ${affectedCount} member(s)** in ${mentionChannel(targetVc.id)}. *(Auto-deleting in 5s)*`,
    5000,
  );

  logEvent('info', 'command_execution', `VC Slam (${isSlam ? 'slam' : 'unslam'}) by ${member.user.tag}`, {
    executor: member.user.tag,
    executorId: member.id,
    guild: guild.name,
    guildId: guild.id,
    vc: targetVc.name,
    action: actionText,
    affectedCount,
  });
}

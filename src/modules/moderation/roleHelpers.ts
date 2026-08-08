import type { Guild, GuildMember, Role, VoiceBasedChannel } from 'discord.js';
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';
import { resolveVoiceChannel } from '../../core/resolver/VoiceChannelResolver.js';

export function canExecutorManage(
  guild: Guild,
  executor: GuildMember,
  targetRole?: Role,
  targetMember?: GuildMember,
): boolean {
  const authority = getAuthorityLevel(executor.id, guild.ownerId);

  // Server Owner, Bot Owner, and Bot Admin bypass EXECUTOR role hierarchy checks (still bounded by Bot's role hierarchy)
  if (authority >= AuthorityLevel.ServerAdmin) {
    return true;
  }

  const executorHighest = executor.roles.highest;

  if (targetRole && executorHighest.position <= targetRole.position) {
    return false;
  }

  if (targetMember && executorHighest.position <= targetMember.roles.highest.position) {
    return false;
  }

  return true;
}

export function isRoleManageable(guild: Guild, role: Role, executor?: GuildMember): boolean {
  if (role.managed) return false;
  if (role.id === guild.id) return false; // @everyone

  const botMember = guild.members.me;
  if (!botMember) return false;

  const botHighest = botMember.roles.highest;
  if (botHighest.position <= role.position) return false;

  if (executor && !canExecutorManage(guild, executor, role, undefined)) {
    return false;
  }

  return true;
}

export function isMemberManageable(guild: Guild, member: GuildMember, executor?: GuildMember): boolean {
  if (member.id === guild.ownerId) return false;

  const botMember = guild.members.me;
  if (!botMember) return false;

  const botHighest = botMember.roles.highest;
  const targetHighest = member.roles.highest;
  if (botHighest.position <= targetHighest.position) return false;

  if (executor && !canExecutorManage(guild, executor, undefined, member)) {
    return false;
  }

  return true;
}

export async function toggleRoleForMember(
  guild: Guild,
  member: GuildMember,
  role: Role,
  executor?: GuildMember,
): Promise<'added' | 'removed' | 'skipped'> {
  if (!isRoleManageable(guild, role, executor)) {
    return 'skipped';
  }

  try {
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      return 'removed';
    } else {
      await member.roles.add(role);
      return 'added';
    }
  } catch {
    return 'skipped';
  }
}

export async function addRoleToMember(
  guild: Guild,
  member: GuildMember,
  role: Role,
  executor?: GuildMember,
): Promise<'added' | 'skipped'> {
  if (!isRoleManageable(guild, role, executor)) {
    return 'skipped';
  }

  if (member.roles.cache.has(role.id)) {
    return 'skipped';
  }

  try {
    await member.roles.add(role);
    return 'added';
  } catch {
    return 'skipped';
  }
}

export async function removeRoleFromMember(
  guild: Guild,
  member: GuildMember,
  role: Role,
  executor?: GuildMember,
): Promise<'removed' | 'skipped'> {
  if (!isRoleManageable(guild, role, executor)) {
    return 'skipped';
  }

  if (!member.roles.cache.has(role.id)) {
    return 'skipped';
  }

  try {
    await member.roles.remove(role);
    return 'removed';
  } catch {
    return 'skipped';
  }
}

export interface ForceMoveParseResult {
  hasFmv: boolean;
  cleanArgs: string[];
  destVc: VoiceBasedChannel | null;
  error?: string;
}

export function extractForceMoveOption(
  args: string[],
  guild: Guild,
  executor: GuildMember,
): ForceMoveParseResult {
  const fmvIndex = args.findIndex(a => {
    const l = a.toLowerCase();
    return l === 'fmv' || l === 'forcemove' || l === 'fm' || l === '--fmv' || l === '--forcemove';
  });

  if (fmvIndex === -1) {
    return { hasFmv: false, cleanArgs: args, destVc: null };
  }

  const nextArg = args[fmvIndex + 1];
  let destVc: VoiceBasedChannel | null = null;
  let cleanArgs: string[];

  if (nextArg && !nextArg.startsWith('-')) {
    const vcResult = resolveVoiceChannel(nextArg, guild);
    if (vcResult.success) {
      destVc = vcResult.value.channel;
      cleanArgs = args.filter((_, i) => i !== fmvIndex && i !== fmvIndex + 1);
    } else {
      cleanArgs = args.filter((_, i) => i !== fmvIndex);
      if (executor.voice.channel) {
        destVc = executor.voice.channel;
      } else {
        return { hasFmv: true, cleanArgs, destVc: null, error: `Voice Channel: ${vcResult.error}` };
      }
    }
  } else {
    cleanArgs = args.filter((_, i) => i !== fmvIndex);
    if (executor.voice.channel) {
      destVc = executor.voice.channel;
    } else {
      return { hasFmv: true, cleanArgs, destVc: null, error: 'You must be in a voice channel or specify a destination VC for forcemove.' };
    }
  }

  return { hasFmv: true, cleanArgs, destVc };
}

export async function executeForceMove(
  members: GuildMember[],
  destVc: VoiceBasedChannel,
): Promise<{ movedCount: number; failedCount: number }> {
  let movedCount = 0;
  let failedCount = 0;

  for (const member of members) {
    if (member.voice.channel && member.voice.channelId !== destVc.id) {
      try {
        await member.voice.setChannel(destVc);
        movedCount++;
      } catch {
        failedCount++;
      }
    }
  }

  return { movedCount, failedCount };
}

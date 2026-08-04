import type { GuildMember } from 'discord.js';
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';
import { getVConfigRulesForGuild } from '../../core/database/repositories/vconfigRepo.js';

export interface VoiceAccessResult {
  allowed: boolean;
  reason?: string;
}

export async function checkVoiceAccess(
  guildId: string,
  member: GuildMember,
  commandName: string,
  channelId?: string | null,
  secondChannelId?: string | null, // e.g. for shiftvc (source & dest)
): Promise<VoiceAccessResult> {
  if (!member) return { allowed: true };

  const ownerId = member.guild?.ownerId ?? '';
  const authority = getAuthorityLevel(member.id, ownerId);

  // Elevated authority bypass: Owner, Bot Admin, Server Admin have server-wide access
  if (authority >= AuthorityLevel.ServerAdmin) {
    return { allowed: true };
  }

  const allRules = await getVConfigRulesForGuild(guildId);
  // Match specific command name or 'all' / '*' wildcard
  const commandRules = allRules.filter(
    (r) => r.commandName === commandName || r.commandName === 'all' || r.commandName === '*',
  );
  if (commandRules.length === 0) {
    return { allowed: true };
  }

  // Filter rules matching member's roles and map to role positions for hierarchy precedence
  const memberRoles = member.roles?.cache ? Array.from(member.roles.cache.values()) : [];
  const memberRoleMap = new Map<string, number>(memberRoles.map((role) => [role.id, role.position]));

  const applicableRules = commandRules.filter((r) => memberRoleMap.has(r.roleId));
  if (applicableRules.length === 0) {
    return { allowed: true };
  }

  // Sort rules by Discord role hierarchy (highest role position first)
  applicableRules.sort((a, b) => {
    const posA = memberRoleMap.get(a.roleId) ?? 0;
    const posB = memberRoleMap.get(b.roleId) ?? 0;
    return posB - posA;
  });

  // Role Hierarchy Failsafe: Evaluate rules of the member's HIGHEST configured role
  const highestPos = memberRoleMap.get(applicableRules[0].roleId) ?? 0;
  const highestRoleRules = applicableRules.filter(
    (r) => (memberRoleMap.get(r.roleId) ?? 0) === highestPos,
  );

  const targetChannels = [channelId, secondChannelId].filter(Boolean) as string[];
  if (targetChannels.length === 0) {
    return { allowed: true };
  }

  // 1. Blacklist (bl) Evaluation on Highest Role
  const blRules = highestRoleRules.filter((r) => r.mode === 'bl');
  for (const rule of blRules) {
    for (const targetChan of targetChannels) {
      if (rule.channelIds.includes(targetChan) || rule.channelIds.includes('all') || rule.channelIds.includes('*')) {
        return {
          allowed: false,
          reason: `Your role (<@&${rule.roleId}>) is blacklisted from using \`${commandName}\` in that voice channel.`,
        };
      }
    }
  }

  // 2. Whitelist (wl) Evaluation on Highest Role
  const wlRules = highestRoleRules.filter((r) => r.mode === 'wl');
  if (wlRules.length > 0) {
    for (const targetChan of targetChannels) {
      const isWhitelistedInAny = wlRules.some(
        (rule) =>
          rule.channelIds.includes(targetChan) ||
          rule.channelIds.includes('all') ||
          rule.channelIds.includes('*'),
      );
      if (!isWhitelistedInAny) {
        return {
          allowed: false,
          reason: `Your role is restricted to specific voice channels for \`${commandName}\`. That voice channel is not whitelisted.`,
        };
      }
    }
  }

  return { allowed: true };
}

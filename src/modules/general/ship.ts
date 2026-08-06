import { PermissionsBitField } from 'discord.js';
import type { User, GuildTextBasedChannel } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import type { ComponentV2Payload } from '../../core/utils/componentsV2.js';
import { sanitize } from '../../core/utils/validators.js';
import { getAuthorityLevel } from '../../core/permissions/PermissionChecker.js';
import { AuthorityLevel } from '../../types/permission.js';
import { getShipMode, setShipMode } from '../../core/database/repositories/shipRepo.js';
import { hasPermit } from '../../core/database/repositories/permissionRepo.js';

export function calculateCompatibility(id1: string, id2: string): number {
  if (id1 === id2) return 100;
  const pair = [id1, id2].sort().join(':');
  let hash = 0;
  for (let i = 0; i < pair.length; i++) {
    hash = (hash * 33 + pair.charCodeAt(i)) & 0x7fffffff;
  }
  return hash % 101;
}

export function generateShipName(name1: string, name2: string): string {
  const clean1 = name1.replace(/[^a-zA-Z0-9]/g, '') || name1;
  const clean2 = name2.replace(/[^a-zA-Z0-9]/g, '') || name2;
  const half1 = clean1.slice(0, Math.ceil(clean1.length / 2));
  const half2 = clean2.slice(Math.floor(clean2.length / 2));
  const combined = (half1 + half2).toLowerCase();
  if (!combined) return 'Lovebirds';
  return combined.charAt(0).toUpperCase() + combined.slice(1);
}

export function getProgressBar(percent: number): string {
  const filled = Math.round((percent / 100) * 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export function getRelationshipInfo(percent: number): { title: string; desc: string; emoji: string } {
  if (percent === 100) {
    return { emoji: '💖', title: 'Absolute Soulmates', desc: 'A match written in the cosmos! Truly inseparable.' };
  }
  if (percent >= 90) {
    return { emoji: '💝', title: 'Match Made in Heaven', desc: 'Pure sparks! You two are extremely compatible.' };
  }
  if (percent >= 75) {
    return { emoji: '💕', title: 'Deep Connection', desc: 'Strong chemistry and endless romantic potential.' };
  }
  if (percent >= 60) {
    return { emoji: '💗', title: 'Sweet Passion', desc: 'A very promising bond filled with affection.' };
  }
  if (percent >= 50) {
    return { emoji: '💛', title: 'Good Compatibility', desc: 'Great chemistry! You make an awesome duo.' };
  }
  if (percent >= 35) {
    return { emoji: '💙', title: 'Casual Connection', desc: 'There is potential, but it takes time and effort.' };
  }
  if (percent >= 20) {
    return { emoji: '🖤', title: 'Awkward Tension', desc: 'Things might get a little rocky. Proceed with caution!' };
  }
  return { emoji: '💔', title: 'Disaster Combo', desc: 'Total mismatch! Stay far away from each other!' };
}

export function buildShipV2Embed(user1: User, user2: User): ComponentV2Payload {
  const isSelf = user1.id === user2.id;
  const percent = calculateCompatibility(user1.id, user2.id);
  const progressBar = getProgressBar(percent);
  const rel = getRelationshipInfo(percent);
  const shipName = isSelf ? `${user1.username} (Self Love)` : generateShipName(user1.username, user2.username);

  const header =
    `# ${rel.emoji} Love Compatibility & Ship Analysis\n\n` +
    `**💘 Match Pair:** <@${user1.id}> × <@${user2.id}>\n` +
    `**🏷️ Ship Name:** \`${shipName}\``;

  const section =
    `**📊 Compatibility Meter**\n` +
    `\`[${progressBar}]\` **${percent}%**\n\n` +
    `**${rel.emoji} Status: ${rel.title}**\n` +
    `_${rel.desc}_`;

  return buildV2Container({
    text: sanitize(header),
    sections: [sanitize(section)],
  });
}

export default defineCommand({
  name: 'ship',
  aliases: ['match', 'love', 'shipping', 'affinity'],
  module: 'general',
  description: 'Calculate love compatibility percentage between two users, or configure server access mode (global / staff).',
  usage: 'ship <@user1> [@user2] | ship mode <global|staff>',
  examples: ['ship @User', 'ship @User1 @User2', 'ship mode global', 'ship mode staff'],
  permissions: [],
  botPermissions: [PermissionsBitField.Flags.SendMessages],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, respond, channel } = ctx;

    if (parsed.args.length === 0) {
      await respond.error('Usage: `?ship <@user1> [@user2]` or `?ship mode <global|staff>`');
      return;
    }

    const firstArg = parsed.args[0].toLowerCase();

    // ── Subcommand: mode / access configuration ───────────────
    if (firstArg === 'mode' || firstArg === 'access' || firstArg === 'config') {
      const authority = getAuthorityLevel(member.id, guild.ownerId);
      const isElevated =
        authority >= AuthorityLevel.ServerAdmin ||
        member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
        member.permissions.has(PermissionsBitField.Flags.Administrator);

      if (!isElevated) {
        await respond.denied('Only server administrators or bot owners can configure ship command access mode.');
        return;
      }

      if (parsed.args.length === 1) {
        const currentMode = await getShipMode(guild.id);
        await respond.info(`Ship command access mode in this server is currently set to **\`${currentMode.toUpperCase()}\`**.`);
        return;
      }

      const targetMode = parsed.args[1].toLowerCase();
      if (targetMode === 'global' || targetMode === 'public' || targetMode === 'everyone') {
        await setShipMode(guild.id, 'global');
        await respond.success('Ship command access set to **GLOBAL**. Everyone in this server can use the ship command.');
      } else if (targetMode === 'staff' || targetMode === 'staffonly' || targetMode === 'restrict') {
        await setShipMode(guild.id, 'staff');
        await respond.success('Ship command access set to **STAFF-ONLY**. Only staff members and permitted users/roles can use the ship command.');
      } else {
        await respond.error('Invalid mode. Valid options are `global` or `staff`. Example: `?ship mode global`');
      }
      return;
    }

    // ── Access Control Enforcement ────────────────────────────
    const currentMode = await getShipMode(guild.id);
    if (currentMode === 'staff') {
      const authority = getAuthorityLevel(member.id, guild.ownerId);
      const isStaff =
        authority >= AuthorityLevel.Normal &&
        (authority > AuthorityLevel.Normal ||
          member.permissions.has(PermissionsBitField.Flags.Administrator) ||
          member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
          member.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
          member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
          member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
          member.permissions.has(PermissionsBitField.Flags.MoveMembers) ||
          member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
          member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
          member.permissions.has(PermissionsBitField.Flags.KickMembers));

      const memberRoleIds = Array.from(member.roles.cache.keys());
      const hasCustomPermit = await hasPermit(guild.id, member.id, memberRoleIds, 'ship', 'general');

      if (!isStaff && !hasCustomPermit) {
        await respond.denied('The ship command is currently set to **Staff-Only** in this server. An administrator can change this using `?ship mode global` or grant access via `?access add @role ship`.');
        return;
      }
    }

    // ── Main Shipping Execution ───────────────────────────────
    let u1: User;
    let u2: User;

    if (parsed.args.length === 1) {
      u1 = member.user;
      const res2 = await resolveUser(parsed.args[0], guild);
      if (!res2.success) {
        await respond.error(`Target: ${res2.error}`);
        return;
      }
      u2 = res2.value.user;
    } else {
      const res1 = await resolveUser(parsed.args[0], guild);
      if (!res1.success) {
        await respond.error(`User 1: ${res1.error}`);
        return;
      }
      u1 = res1.value.user;

      const res2 = await resolveUser(parsed.args[1], guild);
      if (!res2.success) {
        await respond.error(`User 2: ${res2.error}`);
        return;
      }
      u2 = res2.value.user;
    }

    const payload = buildShipV2Embed(u1, u2);
    await (channel as GuildTextBasedChannel).send(payload);
  },
});

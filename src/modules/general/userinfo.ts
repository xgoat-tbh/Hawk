import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } from 'discord.js';
import type { User, GuildMember } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { mentionUser, mentionRole } from '../../core/utils/formatters.js';
import { HawkTheme } from '../../core/ui/theme.js';

export default defineCommand({
  name: 'userinfo',
  aliases: ['whois', 'ui', 'user', 'memberinfo'],
  module: 'general',
  description: 'Display detailed information, avatar, and permissions for a user or member.',
  usage: 'userinfo [user] OR reply with userinfo',
  examples: ['userinfo', 'userinfo @User', 'userinfo 123456789012345678'],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, replyTarget, respond } = ctx;

    let targetUser: User;
    let targetMember: GuildMember | null = null;

    if (parsed.args.length > 0) {
      const res = await resolveUser(parsed.args.join(' '), guild);
      if (!res.success) {
        await respond.error(res.error);
        return;
      }
      targetUser = res.value.user;
      targetMember = res.value.member ?? null;
    } else if (replyTarget) {
      targetUser = replyTarget.user;
      targetMember = replyTarget;
    } else {
      targetUser = member.user;
      targetMember = member;
    }

    const createdUnix = Math.floor(targetUser.createdTimestamp / 1000);
    const joinedUnix = targetMember?.joinedTimestamp ? Math.floor(targetMember.joinedTimestamp / 1000) : null;

    const embed = new EmbedBuilder()
      .setColor(HawkTheme.colors.primary)
      .setAuthor({
        name: `User Information — ${targetUser.username}`,
        iconURL: targetUser.displayAvatarURL(),
      })
      .setThumbnail(targetUser.displayAvatarURL({ size: 1024 }))
      .addFields({
        name: 'Identity',
        value:
          `**User:** ${mentionUser(targetUser.id)} (\`${targetUser.tag}\`)\n` +
          `**User ID:** \`${targetUser.id}\`\n` +
          `**Bot:** ${targetUser.bot ? 'Yes' : 'No'}\n` +
          `**Account Created:** <t:${createdUnix}:F> (<t:${createdUnix}:R>)` +
          (joinedUnix ? `\n**Joined Server:** <t:${joinedUnix}:F> (<t:${joinedUnix}:R>)` : ''),
      });

    // Roles Section (if in server)
    if (targetMember) {
      const roles = targetMember.roles.cache
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.position - a.position);

      const roleMentions = roles.map((r) => mentionRole(r.id));
      const roleText = roleMentions.length > 0
        ? (roleMentions.length <= 15 ? roleMentions.join(' ') : `${roleMentions.slice(0, 15).join(' ')} +${roleMentions.length - 15} more`)
        : 'None';

      const keyPerms: string[] = [];
      const perms = targetMember.permissions;
      if (perms.has(PermissionsBitField.Flags.Administrator)) keyPerms.push('Administrator');
      else {
        if (perms.has(PermissionsBitField.Flags.ManageGuild)) keyPerms.push('Manage Server');
        if (perms.has(PermissionsBitField.Flags.ManageRoles)) keyPerms.push('Manage Roles');
        if (perms.has(PermissionsBitField.Flags.ManageChannels)) keyPerms.push('Manage Channels');
        if (perms.has(PermissionsBitField.Flags.BanMembers)) keyPerms.push('Ban Members');
        if (perms.has(PermissionsBitField.Flags.KickMembers)) keyPerms.push('Kick Members');
        if (perms.has(PermissionsBitField.Flags.ManageMessages)) keyPerms.push('Manage Messages');
        if (perms.has(PermissionsBitField.Flags.MentionEveryone)) keyPerms.push('Mention Everyone');
        if (perms.has(PermissionsBitField.Flags.MoveMembers)) keyPerms.push('Move Members');
      }

      embed.addFields(
        {
          name: `Roles [${roles.size}]`,
          value: roleText,
        },
        {
          name: 'Key Permissions',
          value: keyPerms.length > 0 ? keyPerms.join(', ') : 'Standard Member',
        }
      );
    }

    const avatarBtn = new ButtonBuilder()
      .setLabel('View Avatar')
      .setStyle(ButtonStyle.Link)
      .setURL(targetUser.displayAvatarURL({ size: 4096, extension: 'png' }));

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(avatarBtn);

    await respond.raw({
      embeds: [embed],
      components: [row],
    });
  },
});

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { User, GuildMember } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { HawkTheme } from '../../core/ui/theme.js';

export default defineCommand({
  name: 'avatar',
  aliases: ['av', 'pfp', 'useravatar'],
  module: 'general',
  description: 'Display a user\'s avatar image with high-resolution download links.',
  usage: 'avatar [user] OR reply with avatar',
  examples: ['avatar', 'avatar @User', 'avatar 123456789012345678'],
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

    const globalAvatarUrl = targetUser.displayAvatarURL({ size: 4096, extension: 'png' });
    const serverAvatarUrl = targetMember?.avatarURL({ size: 4096, extension: 'png' });

    const isAnimated = targetUser.avatar?.startsWith('a_') || (targetMember?.avatar?.startsWith('a_') ?? false);

    const buttons: ButtonBuilder[] = [
      new ButtonBuilder()
        .setLabel('PNG')
        .setStyle(ButtonStyle.Link)
        .setURL(targetUser.displayAvatarURL({ size: 4096, extension: 'png' })),
      new ButtonBuilder()
        .setLabel('JPG')
        .setStyle(ButtonStyle.Link)
        .setURL(targetUser.displayAvatarURL({ size: 4096, extension: 'jpg' })),
      new ButtonBuilder()
        .setLabel('WebP')
        .setStyle(ButtonStyle.Link)
        .setURL(targetUser.displayAvatarURL({ size: 4096, extension: 'webp' })),
    ];

    if (isAnimated) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('GIF')
          .setStyle(ButtonStyle.Link)
          .setURL(targetUser.displayAvatarURL({ size: 4096, extension: 'gif' })),
      );
    }

    if (serverAvatarUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Server Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(serverAvatarUrl),
      );
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 5));

    const embed = new EmbedBuilder()
      .setColor(HawkTheme.colors.primary)
      .setAuthor({
        name: `${targetUser.username}'s Avatar`,
        iconURL: globalAvatarUrl,
        url: globalAvatarUrl,
      })
      .setDescription(
        `**User:** \`${targetUser.tag}\` (${targetUser.id})` +
        (serverAvatarUrl ? ` • [Server Avatar](${serverAvatarUrl})` : '')
      )
      .setImage(globalAvatarUrl);

    await respond.raw({
      embeds: [embed],
      components: [row],
    });
  },
});

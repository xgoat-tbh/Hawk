import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { User } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { resolveUser } from '../../core/resolver/UserResolver.js';
import { ui } from '../../core/ui/index.js';

export default defineCommand({
  name: 'banner',
  aliases: ['userbanner', 'ubanner'],
  module: 'general',
  description: 'Display a user\'s or server\'s banner with download links.',
  usage: 'banner [user|server] OR reply with banner',
  examples: ['banner', 'banner @User', 'banner server'],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { parsed, guild, member, replyTarget, respond } = ctx;

    const firstArg = parsed.args[0]?.toLowerCase();

    if (firstArg === 'server' || firstArg === 'guild') {
      const bannerUrl = guild.bannerURL({ size: 4096, extension: 'png' });
      if (!bannerUrl) {
        await respond.info(`**${guild.name}** does not have a server banner set.`);
        return;
      }

      const button = new ButtonBuilder()
        .setLabel('Open High-Res Banner')
        .setStyle(ButtonStyle.Link)
        .setURL(bannerUrl);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      const payload = ui.standard({
        title: `${guild.name}'s Server Banner`,
        sections: [`[View Full Resolution Banner](${bannerUrl})`],
        components: [row],
      });

      await respond.raw({
        components: payload.components,
        flags: payload.flags as any,
      });
      return;
    }

    let targetUser: User;
    if (parsed.args.length > 0) {
      const res = await resolveUser(parsed.args.join(' '), guild);
      if (!res.success) {
        await respond.error(res.error);
        return;
      }
      targetUser = res.value.user;
    } else if (replyTarget) {
      targetUser = replyTarget.user;
    } else {
      targetUser = member.user;
    }

    try {
      const fetchedUser = await targetUser.fetch(true);
      const bannerUrl = fetchedUser.bannerURL({ size: 4096, extension: 'png' });

      if (!bannerUrl) {
        const accentHex = fetchedUser.hexAccentColor ? ` (Accent: \`${fetchedUser.hexAccentColor}\`)` : '';
        await respond.info(`**${targetUser.username}** does not have a profile banner set${accentHex}.`);
        return;
      }

      const isAnimated = fetchedUser.banner?.startsWith('a_');
      const buttons: ButtonBuilder[] = [
        new ButtonBuilder()
          .setLabel('PNG')
          .setStyle(ButtonStyle.Link)
          .setURL(fetchedUser.bannerURL({ size: 4096, extension: 'png' })!),
        new ButtonBuilder()
          .setLabel('JPG')
          .setStyle(ButtonStyle.Link)
          .setURL(fetchedUser.bannerURL({ size: 4096, extension: 'jpg' })!),
        new ButtonBuilder()
          .setLabel('WebP')
          .setStyle(ButtonStyle.Link)
          .setURL(fetchedUser.bannerURL({ size: 4096, extension: 'webp' })!),
      ];

      if (isAnimated) {
        buttons.push(
          new ButtonBuilder()
            .setLabel('GIF')
            .setStyle(ButtonStyle.Link)
            .setURL(fetchedUser.bannerURL({ size: 4096, extension: 'gif' })!),
        );
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 5));

      const payload = ui.standard({
        title: `${targetUser.username}'s Banner`,
        sections: [
          `**User:** \`${targetUser.tag}\` (${targetUser.id})\n` +
          `[Open Banner in Browser](${bannerUrl})`,
        ],
        components: [row],
      });

      await respond.raw({
        components: payload.components,
        flags: payload.flags as any,
      });
    } catch {
      await respond.error(`Could not fetch banner for **${targetUser.username}**.`);
    }
  },
});

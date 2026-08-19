import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { HawkTheme } from '../../core/ui/theme.js';

export default defineCommand({
  name: 'serverinfo',
  aliases: ['sinfo', 'guildinfo', 'si', 'server'],
  module: 'general',
  description: 'Display detailed server information, icon thumbnail, statistics, and counts.',
  usage: 'serverinfo',
  examples: ['serverinfo'],
  cooldown: 3,

  async execute(ctx: CommandContext): Promise<void> {
    const { guild, respond } = ctx;

    const createdUnix = Math.floor(guild.createdTimestamp / 1000);
    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter((m) => m.user.bot).size;
    const humanCount = totalMembers - botCount;

    const channels = guild.channels.cache;
    const textChannels = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const stageChannels = channels.filter((c) => c.type === ChannelType.GuildStageVoice).size;
    const forumChannels = channels.filter((c) => c.type === ChannelType.GuildForum).size;
    const categoryChannels = channels.filter((c) => c.type === ChannelType.GuildCategory).size;

    const rolesCount = guild.roles.cache.size - 1; // exclude @everyone
    const emojisCount = guild.emojis.cache.size;
    const stickersCount = guild.stickers.cache.size;

    const boostTier = guild.premiumTier === 0 ? 'None' : `Tier ${guild.premiumTier}`;
    const boostCount = guild.premiumSubscriptionCount ?? 0;

    const iconUrl = guild.iconURL({ size: 4096, extension: 'png' });
    const bannerUrl = guild.bannerURL({ size: 4096, extension: 'png' });
    const splashUrl = guild.splashURL({ size: 4096, extension: 'png' });

    const embed = new EmbedBuilder()
      .setColor(HawkTheme.colors.primary)
      .setAuthor({
        name: guild.name,
        iconURL: iconUrl ?? undefined,
      })
      .addFields(
        {
          name: 'General Information',
          value:
            `**Owner:** ${mentionUser(guild.ownerId)} (\`${guild.ownerId}\`)\n` +
            `**Server ID:** \`${guild.id}\`\n` +
            `**Created:** <t:${createdUnix}:F> (<t:${createdUnix}:R>)\n` +
            `**Verification Level:** \`${guild.verificationLevel}\``,
        },
        {
          name: 'Counts & Statistics',
          value:
            `**Members (${totalMembers}):** ${humanCount} Humans • ${botCount} Bots\n` +
            `**Channels (${channels.size}):** ${textChannels} Text • ${voiceChannels} Voice • ${stageChannels} Stage • ${forumChannels} Forum • ${categoryChannels} Categories\n` +
            `**Roles:** ${rolesCount} • **Emojis:** ${emojisCount} • **Stickers:** ${stickersCount}`,
        },
        {
          name: 'Boost & Features',
          value:
            `**Boost Status:** ${boostTier} (${boostCount} Boost${boostCount === 1 ? '' : 's'})` +
            (guild.vanityURLCode ? `\n**Vanity URL:** \`discord.gg/${guild.vanityURLCode}\`` : ''),
        }
      );

    if (iconUrl) {
      embed.setThumbnail(iconUrl);
    }

    const buttons: ButtonBuilder[] = [];

    if (iconUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Server Icon')
          .setStyle(ButtonStyle.Link)
          .setURL(iconUrl),
      );
    }

    if (bannerUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Server Banner')
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl),
      );
    }

    if (splashUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Invite Splash')
          .setStyle(ButtonStyle.Link)
          .setURL(splashUrl),
      );
    }

    const row = buttons.length > 0 ? new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 5)) : undefined;

    await respond.raw({
      embeds: [embed],
      components: row ? [row] : undefined,
    });
  },
});

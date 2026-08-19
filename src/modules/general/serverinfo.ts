import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import { defineCommand } from '../../types/command.js';
import type { CommandContext } from '../../types/command.js';
import { mentionUser } from '../../core/utils/formatters.js';
import { ui } from '../../core/ui/index.js';

export default defineCommand({
  name: 'serverinfo',
  aliases: ['sinfo', 'guildinfo', 'si', 'server'],
  module: 'general',
  description: 'Display detailed server information, statistics, and counts.',
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

    const sections: string[] = [
      `**Owner:** ${mentionUser(guild.ownerId)} (\`${guild.ownerId}\`)\n` +
      `**Server ID:** \`${guild.id}\`\n` +
      `**Created:** <t:${createdUnix}:F> (<t:${createdUnix}:R>)\n` +
      `**Verification Level:** \`${guild.verificationLevel}\``,

      `**Members (${totalMembers}):** ${humanCount} Humans • ${botCount} Bots\n` +
      `**Channels (${channels.size}):** ${textChannels} Text • ${voiceChannels} Voice • ${stageChannels} Stage • ${forumChannels} Forum • ${categoryChannels} Categories\n` +
      `**Roles:** ${rolesCount} • **Emojis:** ${emojisCount} • **Stickers:** ${stickersCount}`,

      `**Boost Status:** ${boostTier} (${boostCount} Boost${boostCount === 1 ? '' : 's'})` +
      (guild.vanityURLCode ? `\n**Vanity URL:** \`discord.gg/${guild.vanityURLCode}\`` : ''),
    ];

    const buttons: ButtonBuilder[] = [];

    const iconUrl = guild.iconURL({ size: 4096, extension: 'png' });
    if (iconUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Server Icon')
          .setStyle(ButtonStyle.Link)
          .setURL(iconUrl),
      );
    }

    const bannerUrl = guild.bannerURL({ size: 4096, extension: 'png' });
    if (bannerUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Server Banner')
          .setStyle(ButtonStyle.Link)
          .setURL(bannerUrl),
      );
    }

    const splashUrl = guild.splashURL({ size: 4096, extension: 'png' });
    if (splashUrl) {
      buttons.push(
        new ButtonBuilder()
          .setLabel('Invite Splash')
          .setStyle(ButtonStyle.Link)
          .setURL(splashUrl),
      );
    }

    const row = buttons.length > 0 ? new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 5)) : undefined;

    const payload = ui.standard({
      title: `${guild.name}`,
      sections,
      components: row ? [row] : undefined,
    });

    await respond.raw({
      components: payload.components,
      flags: payload.flags as any,
    });
  },
});

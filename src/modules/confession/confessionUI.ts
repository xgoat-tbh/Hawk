import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { branding } from '../../core/config/branding.js';

export function buildConfessionPanel(): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const embed = new EmbedBuilder()
    .setTitle('🤫 Anonymous Confessions')
    .setDescription(
      'Share your thoughts, stories, or confessions completely anonymously.\n\n' +
      'Click **Submit Confession** below to open the modal submission form. Your identity is never shown on the public post.',
    )
    .setColor(branding.defaultColor);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('confess_open_modal')
      .setLabel('Submit Confession')
      .setEmoji('🤫')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('confess_info')
      .setLabel('Guidelines')
      .setEmoji('ℹ️')
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row] };
}

export function buildAnonymousConfessionEmbed(content: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('🤫 Anonymous Confession')
    .setDescription(content)
    .setColor(branding.defaultColor)
    .setTimestamp();
}

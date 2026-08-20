import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ui, type ComponentV2Payload } from '../../core/ui/index.js';
import { getEmoji } from '../../core/config/branding.js';

export function buildConfessionPanel(): ComponentV2Payload {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('confess_open_modal')
      .setLabel('Submit Confession')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('confess_info')
      .setLabel('Guidelines')
      .setStyle(ButtonStyle.Secondary),
  );

  const emoji = getEmoji('confession');
  const title = emoji ? `${emoji} Anonymous Confessions` : 'Anonymous Confessions';

  return ui.standard({
    title,
    text:
      'Share your thoughts, stories, or confessions completely anonymously.\n\n' +
      'Click **Submit Confession** below to submit. Your identity is never displayed on the public post.',
    components: [row],
  });
}

export function buildAnonymousConfessionPayload(content: string): ComponentV2Payload {
  const emoji = getEmoji('confession');
  const title = emoji ? `${emoji} Anonymous Confession` : 'Anonymous Confession';

  return ui.standard({
    title,
    text: content,
  });
}

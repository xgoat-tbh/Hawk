import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import type { ButtonInteraction, GuildMember } from 'discord.js';
import { consoleLog } from '../../core/logging/ConsoleLogger.js';

// Pre-curated fallback anime GIF URLs for each action
const FALLBACK_GIFS: Record<string, string[]> = {
  hug: [
    'https://media.giphy.com/media/lrr91983vOTW8/giphy.gif',
    'https://media.giphy.com/media/u9BxkmXgOwMMo/giphy.gif',
    'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
    'https://media.giphy.com/media/PHZ7v9tfQu0o0/giphy.gif',
  ],
  kiss: [
    'https://media.giphy.com/media/FqVM4892kmLR6/giphy.gif',
    'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
    'https://media.giphy.com/media/QGc80ZaFZCHhS/giphy.gif',
    'https://media.giphy.com/media/Wm8fW4z0Fh0b1u655S/giphy.gif',
  ],
  cuddle: [
    'https://media.giphy.com/media/143v0Z4767T15e/giphy.gif',
    'https://media.giphy.com/media/VG30a3XlPStsA/giphy.gif',
    'https://media.giphy.com/media/S6ZlyZ0a6y0F2/giphy.gif',
  ],
  pat: [
    'https://media.giphy.com/media/5tmRHwD75vw82uZ4zQ/giphy.gif',
    'https://media.giphy.com/media/ARSp9T7wwxNcs/giphy.gif',
    'https://media.giphy.com/media/L2z7ILmjTOZZS/giphy.gif',
  ],
  slap: [
    'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
    'https://media.giphy.com/media/Zau0yRL15t84w/giphy.gif',
    'https://media.giphy.com/media/j3iGKfXRKlLqw/giphy.gif',
  ],
  bite: [
    'https://media.giphy.com/media/13Z0Z4W9d854eA/giphy.gif',
    'https://media.giphy.com/media/OqJ92TjI8f8270x0u9/giphy.gif',
    'https://media.giphy.com/media/oX2E0U36o3rP3q6t24/giphy.gif',
  ],
  holdhands: [
    'https://media.giphy.com/media/EPQfELrpbh56W5xWj4/giphy.gif',
    'https://media.giphy.com/media/mp1JYId8n0t3y/giphy.gif',
    'https://media.giphy.com/media/k5IqP83B4e3E4/giphy.gif',
  ],
  handhold: [
    'https://media.giphy.com/media/EPQfELrpbh56W5xWj4/giphy.gif',
    'https://media.giphy.com/media/mp1JYId8n0t3y/giphy.gif',
  ],
  lick: [
    'https://media.giphy.com/media/8HqJ0aK0m15F540nZ5/giphy.gif',
    'https://media.giphy.com/media/13BwKHda33nihW/giphy.gif',
  ],
  poke: [
    'https://media.giphy.com/media/31X0APFZAKKte/giphy.gif',
    'https://media.giphy.com/media/vU14Y2a441Dq0/giphy.gif',
  ],
  highfive: [
    'https://media.giphy.com/media/10Uheed412yPPM/giphy.gif',
    'https://media.giphy.com/media/3oEjHV0z85GPvfxk2Q/giphy.gif',
  ],
  lappillow: [
    'https://media.giphy.com/media/L0C0f91lC9tW8/giphy.gif',
    'https://media.giphy.com/media/12A32xJgQu571K/giphy.gif',
  ],
  tickle: [
    'https://media.giphy.com/media/10g14pY7S0N1Gk/giphy.gif',
    'https://media.giphy.com/media/xT1R3x7Lg4Jj1Zz1i8/giphy.gif',
  ],
  blush: [
    'https://media.giphy.com/media/tFjN51Wj2LwV02z5Xf/giphy.gif',
    'https://media.giphy.com/media/26hpKMTa535v7z28M/giphy.gif',
  ],
  wink: [
    'https://media.giphy.com/media/13vPE0A3mgWqC4/giphy.gif',
    'https://media.giphy.com/media/148x4ezZXvpIeA/giphy.gif',
  ],
  smile: [
    'https://media.giphy.com/media/10t57cXgow7504/giphy.gif',
    'https://media.giphy.com/media/3o6UB3VhArvomJHtdK/giphy.gif',
  ],
};

// Map internal action names to nekos.best API endpoints
const NEKOS_BEST_MAP: Record<string, string> = {
  hug: 'hug',
  kiss: 'kiss',
  cuddle: 'cuddle',
  pat: 'pat',
  slap: 'slap',
  bite: 'bite',
  holdhands: 'handhold',
  handhold: 'handhold',
  lick: 'lick',
  poke: 'poke',
  highfive: 'highfive',
  lappillow: 'lappillow',
  tickle: 'tickle',
  blush: 'blush',
  wink: 'wink',
  smile: 'smile',
};

export async function fetchAnimeGif(action: string): Promise<string> {
  const apiEndpoint = NEKOS_BEST_MAP[action] || action;
  try {
    const res = await fetch(`https://nekos.best/api/v2/${apiEndpoint}`, {
      headers: { 'User-Agent': 'HawkDiscordBot/1.0' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { results?: Array<{ url?: string }> };
      if (data.results && data.results.length > 0 && data.results[0].url) {
        return data.results[0].url;
      }
    }
  } catch {
    // API timeout or failure -> fallback below
  }

  const list = FALLBACK_GIFS[action] || FALLBACK_GIFS.hug;
  return list[Math.floor(Math.random() * list.length)];
}

export interface ActionInfo {
  name: string;
  emoji: string;
  verb: string;
  sendbackLabel: string;
  selfOnly?: boolean;
}

export function buildActionPayload(
  actionInfo: ActionInfo,
  author: GuildMember,
  target: GuildMember | null,
  gifUrl: string,
): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const isSelf = !target || target.id === author.id;

  let titleText = '';
  if (isSelf) {
    titleText = `${author.displayName} ${actionInfo.verb} ${actionInfo.emoji}`;
  } else {
    titleText = `${author.displayName} ${actionInfo.verb} ${target.displayName}! ${actionInfo.emoji}`;
  }

  const embed = new EmbedBuilder()
    .setDescription(`### ${titleText}`)
    .setImage(gifUrl)
    .setColor(0xff69b4);

  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  if (!isSelf && target && !actionInfo.selfOnly) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`act_back_${actionInfo.name}_${target.id}_${author.id}`)
        .setLabel(actionInfo.sendbackLabel)
        .setStyle(ButtonStyle.Primary),
    );
    components.push(row);
  }

  return { embeds: [embed], components };
}

export async function handleActionInteraction(interaction: ButtonInteraction): Promise<void> {
  const { customId, guild, member } = interaction;
  if (!guild || !member || interaction.replied || interaction.deferred) return;

  // Format: act_back_{action}_{targetId}_{authorId}
  const parts = customId.split('_');
  if (parts.length < 5) return;

  const actionName = parts[2];
  const targetId = parts[3];
  const originalAuthorId = parts[4];

  if (interaction.user.id !== targetId) {
    await interaction.reply({
      content: `Only <@${targetId}> can use this button to respond!`,
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return;
  }

  await interaction.deferReply().catch(() => {});

  const originalAuthor = await guild.members.fetch(originalAuthorId).catch(() => null);
  if (!originalAuthor) {
    await interaction.editReply({ content: 'The user is no longer in this server.' }).catch(() => {});
    return;
  }

  const gifUrl = await fetchAnimeGif(actionName);
  const actionInfo: ActionInfo = {
    name: actionName,
    emoji: getEmojiForAction(actionName),
    verb: getVerbForAction(actionName),
    sendbackLabel: `${actionName.toUpperCase()} Back!`,
  };

  const titleText = `${(member as GuildMember).displayName} ${actionInfo.verb} ${originalAuthor.displayName} back! ${actionInfo.emoji}`;
  const embed = new EmbedBuilder()
    .setDescription(`### ${titleText}`)
    .setImage(gifUrl)
    .setColor(0xff69b4);

  await interaction.editReply({ embeds: [embed] }).catch(() => {});

  // Disable original button
  if (interaction.message) {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`act_back_disabled_${Date.now()}`)
        .setLabel('Reciprocated! 💕')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
    );
    await interaction.message.edit({ components: [disabledRow] }).catch(() => {});
  }

  consoleLog('info', 'command_execution', `${member.user.username} used action back ${actionName} on ${originalAuthor.user.username}`);
}

function getEmojiForAction(action: string): string {
  const map: Record<string, string> = {
    hug: '🤗',
    kiss: '💋',
    cuddle: '🫂',
    pat: '🫳',
    slap: '🖐️',
    bite: '🦷',
    holdhands: '🤝',
    handhold: '🤝',
    lick: '👅',
    poke: '👉',
    highfive: '✋',
    lappillow: '🦵',
    tickle: '🪶',
    blush: '😊',
    wink: '😉',
    smile: '😄',
  };
  return map[action] || '✨';
}

function getVerbForAction(action: string): string {
  const map: Record<string, string> = {
    hug: 'hugged',
    kiss: 'kissed',
    cuddle: 'cuddled',
    pat: 'patted',
    slap: 'slapped',
    bite: 'bit',
    holdhands: 'held hands with',
    handhold: 'held hands with',
    lick: 'licked',
    poke: 'poked',
    highfive: 'high-fived',
    lappillow: 'gave a lap pillow to',
    tickle: 'tickled',
    blush: 'is blushing!',
    wink: 'winked at',
    smile: 'smiled at',
  };
  return map[action] || 'interacted with';
}

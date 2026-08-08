import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { Message } from 'discord.js';
import type { SuggestionRecord } from '../../types/suggestion.js';
import { buildV2Container } from '../../core/utils/componentsV2.js';
import type { ComponentV2Payload } from '../../core/utils/componentsV2.js';
import { getSuggestionByNumber, getSuggestionByMessageId } from '../../core/database/repositories/suggestionRepo.js';

export function buildSuggestionPayload(
  suggestion: SuggestionRecord,
  authorTag?: string,
  reason?: string,
): ComponentV2Payload {
  const authorDisplay = authorTag ?? `<@${suggestion.authorId}>`;

  let statusHeader = `**Suggestion #${suggestion.number}**`;
  if (suggestion.status === 'accepted') {
    statusHeader += ` | 🟢 **ACCEPTED**`;
  } else if (suggestion.status === 'considered') {
    statusHeader += ` | 🟡 **UNDER CONSIDERATION**`;
  } else if (suggestion.status === 'denied') {
    statusHeader += ` | 🔴 **DENIED**`;
  }

  const sections: string[] = [
    suggestion.content,
    `Suggested by ${authorDisplay}`,
  ];

  if (suggestion.status !== 'pending') {
    let statusNote = `**Status:** ${suggestion.status.toUpperCase()}`;
    if (reason) {
      statusNote += `\n**Reason:** ${reason}`;
    }
    sections.push(statusNote);
  }

  return buildV2Container({
    text: statusHeader,
    sections,
  });
}

export function buildSuggestionEmbed(
  suggestion: SuggestionRecord,
  authorTag?: string,
): EmbedBuilder {
  const authorDisplay = authorTag ?? `<@${suggestion.authorId}>`;
  return new EmbedBuilder()
    .setTitle(`Suggestion #${suggestion.number}`)
    .setDescription(suggestion.content)
    .setFooter({ text: `Suggested by ${authorDisplay}` });
}

export function buildSuggestionPanelPayload(): ComponentV2Payload {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('suggest_open_modal')
      .setLabel('Suggest')
      .setStyle(ButtonStyle.Secondary),
  );

  return buildV2Container({
    text: '**Suggestions**',
    sections: [
      'Have feedback? Tap the button to submit a suggestion.\n\n**Note:** Keep suggestions respectful and relevant. Inappropriate suggestions may result in a timeout.',
    ],
    components: [row],
  });
}

export async function resolveSuggestionTarget(
  input: string,
  guildId: string,
  message?: Message,
): Promise<SuggestionRecord | null> {
  // 1. Message Reply Reference
  if (message?.reference?.messageId) {
    const byRef = await getSuggestionByMessageId(guildId, message.reference.messageId);
    if (byRef) return byRef;
  }

  const cleanInput = input ? input.trim() : '';
  if (!cleanInput) return null;

  // 2. Message URL: https://discord.com/channels/guildId/channelId/messageId
  const urlMatch = /\/channels\/\d+\/\d+\/(\d{17,20})$/.exec(cleanInput);
  if (urlMatch) {
    return await getSuggestionByMessageId(guildId, urlMatch[1]);
  }

  // 3. Suggestion number: #42 or 42
  const numMatch = /^#?(\d{1,6})$/.exec(cleanInput);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const byNum = await getSuggestionByNumber(guildId, num);
    if (byNum) return byNum;
  }

  // 4. Raw Snowflake Message ID: 123456789012345678
  if (/^\d{17,20}$/.test(cleanInput)) {
    return await getSuggestionByMessageId(guildId, cleanInput);
  }

  return null;
}

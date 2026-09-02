import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { ui, type ComponentV2Payload } from '../../core/ui/index.js';
import type { StoreItem, InventoryEntry } from './storeService.js';

export function buildStorePayload(
  items: StoreItem[],
  currencySymbol: string,
  guildName: string,
  page: number,
  totalPages: number,
  invokerId: string,
): ComponentV2Payload {
  let text = '';
  if (items.length === 0) {
    text = '*The store is currently empty. Admins can add items using `!create-item`.*';
  } else {
    const itemsPerPage = 10;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentItems = items.slice(start, end);

    const lines = currentItems.map((item) => {
      let line = `• **#${item.itemId} · ${item.name}** — \`${currencySymbol}${item.price.toLocaleString()}\``;
      if (item.inventoryRoleId) {
        line += `\n   └ Auto-grants role: <@&${item.inventoryRoleId}>`;
      }
      if (item.description) {
        line += `\n   └ *${item.description}*`;
      }
      return line;
    });

    text = `${lines.join('\n\n')}\n\n*Purchase an item using \`!buy <item_id>\`.*`;
  }

  const prevBtn = new ButtonBuilder()
    .setCustomId(`store_page_prev_${invokerId}_${page}`)
    .setLabel('◀ Previous')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page <= 1);

  const pageIndicator = new ButtonBuilder()
    .setCustomId(`store_page_indicator_${invokerId}`)
    .setLabel(`${page} / ${totalPages || 1}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextBtn = new ButtonBuilder()
    .setCustomId(`store_page_next_${invokerId}_${page}`)
    .setLabel('Next ▶')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages);

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(prevBtn, pageIndicator, nextBtn);

  return ui.standard({
    title: `${guildName} Store Catalog`,
    text,
    components: items.length > 0 ? [actionRow] : [],
  });
}

export function buildItemInfoPayload(item: StoreItem, currencySymbol: string): ComponentV2Payload {
  let content =
    `• **Item ID:** \`${item.itemId}\`\n` +
    `• **Item Name:** **${item.name}**\n` +
    `• **Price:** \`${currencySymbol}${item.price.toLocaleString()}\`\n`;

  if (item.inventoryRoleId) {
    content += `• **Grants Role:** <@&${item.inventoryRoleId}>\n`;
  }

  content += `• **Description:** ${item.description || 'No description provided.'}`;

  return ui.standard({
    title: `Store Item: ${item.name}`,
    text: content,
  });
}

export function buildInventoryPayload(
  entries: InventoryEntry[],
  userName: string,
  avatarUrl: string | undefined,
  currencySymbol: string,
): ComponentV2Payload {
  let text = '';
  if (entries.length === 0) {
    text = '*Your inventory is empty. Browse items in the store with `!store`!*';
  } else {
    const lines = entries.map(entry => {
      return `• **${entry.name}** (x${entry.quantity}) — ID: \`${entry.itemId}\` · Total Value: \`${currencySymbol}${(entry.price * entry.quantity).toLocaleString()}\``;
    });
    text = lines.join('\n');
  }

  return ui.standard({
    title: `${userName}'s Inventory`,
    text,
    thumbnailUrl: avatarUrl,
  });
}

// Backwards compatibility aliases
export const buildInventoryEmbed = buildInventoryPayload;
export const buildStoreEmbed = buildStorePayload;
export const buildItemInfoEmbed = buildItemInfoPayload;




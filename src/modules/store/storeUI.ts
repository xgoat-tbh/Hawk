import { EmbedBuilder } from 'discord.js';
import type { StoreItem, InventoryEntry } from './storeService.js';

export function buildStoreEmbed(items: StoreItem[], currencySymbol: string, guildName: string, page: number, totalPages: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${guildName} Store`)
    .setColor('#00AAFF');

  if (items.length === 0) {
    embed.setDescription('The store is currently empty.');
  } else {
    const itemsPerPage = 10;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const currentItems = items.slice(start, end);

    const description = currentItems.map((item) => {
      return `**${item.itemId}. ${item.name}** — ${currencySymbol}${item.price}\n*${item.description}*`;
    }).join('\n\n');

    embed.setDescription(description);
    embed.setFooter({ text: `Page ${page} of ${totalPages || 1}` });
  }

  return embed;
}

export function buildItemInfoEmbed(item: StoreItem, currencySymbol: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(item.name)
    .setColor('#00AAFF')
    .addFields(
      { name: 'ID', value: item.itemId.toString(), inline: true },
      { name: 'Price', value: `${currencySymbol}${item.price}`, inline: true },
      { name: 'Description', value: item.description || 'No description provided.', inline: false }
    );

  if (item.inventoryRoleId) {
    embed.addFields({ name: 'Grants Role', value: `<@&${item.inventoryRoleId}>`, inline: true });
  }

  return embed;
}

export function buildInventoryEmbed(entries: InventoryEntry[], userName: string, currencySymbol: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${userName}'s Inventory`)
    .setColor('#00AAFF');

  if (entries.length === 0) {
    embed.setDescription('Inventory is empty.');
  } else {
    const description = entries.map(entry => {
      return `**${entry.name}** (x${entry.quantity}) — ID: ${entry.itemId} • Value: ${currencySymbol}${entry.price * entry.quantity}`;
    }).join('\n');
    
    embed.setDescription(description);
  }

  return embed;
}


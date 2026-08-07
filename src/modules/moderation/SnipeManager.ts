import type { Message, PartialMessage } from 'discord.js';

export interface SnipeData {
  content: string;
  authorTag: string;
  authorId: string;
  authorAvatar?: string;
  channelId: string;
  attachments: string[];
  deletedAt: Date;
}

const MAX_SNIPE_ENTRIES = 100;
const snipeCache = new Map<string, SnipeData>();

export function recordDeletedMessage(message: Message | PartialMessage): void {
  if (message.author?.bot || message.author?.system) return;
  if (!message.guild || !message.channel) return;

  const content = message.content || (message.attachments && message.attachments.size > 0 ? '[Attachment Only]' : '');
  const attachments = message.attachments ? Array.from(message.attachments.values()).map(a => a.url) : [];

  if (!content && attachments.length === 0) return;

  // Evict oldest if reaching capacity
  if (snipeCache.size >= MAX_SNIPE_ENTRIES) {
    const firstKey = snipeCache.keys().next().value;
    if (firstKey !== undefined) snipeCache.delete(firstKey);
  }

  snipeCache.set(message.channel.id, {
    content,
    authorTag: message.author?.tag ?? 'Unknown User',
    authorId: message.author?.id ?? '0',
    authorAvatar: message.author?.displayAvatarURL(),
    channelId: message.channel.id,
    attachments,
    deletedAt: new Date(),
  });
}

export function getSnipe(channelId: string): SnipeData | null {
  return snipeCache.get(channelId) ?? null;
}

export function clearSnipeCache(): void {
  snipeCache.clear();
}

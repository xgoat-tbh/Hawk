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

export interface EditSnipeData {
  oldContent: string;
  newContent: string;
  authorTag: string;
  authorId: string;
  authorAvatar?: string;
  channelId: string;
  attachments: string[];
  editedAt: Date;
}

const MAX_SNIPE_ENTRIES = 200;
const snipeCache = new Map<string, SnipeData>();
const editSnipeCache = new Map<string, EditSnipeData>();

export function recordDeletedMessage(message: Message | PartialMessage): void {
  if (message.author?.bot || message.author?.system) return;
  if (!message.guild || !message.channel) return;

  const content = message.content || (message.attachments && message.attachments.size > 0 ? '[Attachment Only]' : '');
  const attachments = message.attachments ? Array.from(message.attachments.values()).map(a => a.url) : [];

  if (!content && attachments.length === 0) return;

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

export function recordEditedMessage(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): void {
  if (newMessage.author?.bot || newMessage.author?.system) return;
  if (!newMessage.guild || !newMessage.channel) return;

  const oldContent = oldMessage.content || '';
  const newContent = newMessage.content || '';

  // Only record if content actually changed
  if (!oldContent && !newContent) return;
  if (oldContent === newContent) return;

  const attachments = newMessage.attachments ? Array.from(newMessage.attachments.values()).map(a => a.url) : [];

  if (editSnipeCache.size >= MAX_SNIPE_ENTRIES) {
    const firstKey = editSnipeCache.keys().next().value;
    if (firstKey !== undefined) editSnipeCache.delete(firstKey);
  }

  editSnipeCache.set(newMessage.channel.id, {
    oldContent: oldContent || '[No Previous Text]',
    newContent: newContent || '[No New Text]',
    authorTag: newMessage.author?.tag ?? 'Unknown User',
    authorId: newMessage.author?.id ?? '0',
    authorAvatar: newMessage.author?.displayAvatarURL(),
    channelId: newMessage.channel.id,
    attachments,
    editedAt: new Date(),
  });
}

export function getSnipe(channelId: string): SnipeData | null {
  return snipeCache.get(channelId) ?? null;
}

export function getEditSnipe(channelId: string): EditSnipeData | null {
  return editSnipeCache.get(channelId) ?? null;
}

export function clearChannelSnipe(channelId: string): boolean {
  const hadSnipe = snipeCache.delete(channelId);
  const hadEditSnipe = editSnipeCache.delete(channelId);
  return hadSnipe || hadEditSnipe;
}

export function clearSnipeCache(): void {
  snipeCache.clear();
  editSnipeCache.clear();
}

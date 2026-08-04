import type { Message } from 'discord.js';

export enum MessageType { Normal = 'normal', PrefixCommand = 'prefix_command', BotMention = 'bot_mention' }

export function classifyMessage(message: Message, prefix: string): MessageType {
  const content = message.content.trim();
  if (content.toLowerCase().startsWith(prefix.toLowerCase())) return MessageType.PrefixCommand;
  const botId = message.client.user?.id;
  if (botId) {
    const mentionPattern = new RegExp(`^<@!?${botId}>\\s*$`);
    if (mentionPattern.test(content)) return MessageType.BotMention;
  }
  return MessageType.Normal;
}

export async function handleBotMention(message: Message, prefix: string): Promise<void> {
  if (message.author.bot) return;
  await message.reply({
    content: `**Hey! My current prefix is \`${prefix}\`**\nUse \`${prefix}help\` to browse my commands.`,
    allowedMentions: { repliedUser: true },
  }).catch(() => {});
}

export function mentionUser(id: string): string {
  return `<@${id}>`;
}

export function mentionRole(id: string): string {
  return `<@&${id}>`;
}

export function mentionChannel(id: string): string {
  return `<#${id}>`;
}

export function timestamp(date: Date, style: 'R' | 'f' | 'F' | 't' | 'T' | 'd' | 'D' = 'R'): string {
  const seconds = Math.floor(date.getTime() / 1000);
  return `<t:${seconds}:${style}>`;
}

export function codeBlock(text: string, language = ''): string {
  return `\`\`\`${language}\n${text}\n\`\`\``;
}

export function inlineCode(text: string): string {
  return `\`${text}\``;
}

export function bold(text: string): string {
  return `**${text}**`;
}
